-- Internal application ledger. These are app-to-app transfers, not Wells Fargo or external-bank transfers.
create extension if not exists pgcrypto;

create table if not exists public.internal_wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  account_number text not null unique default ('TX' || upper(substr(encode(gen_random_bytes(10), 'hex'), 1, 12))),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_transactions (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null,
  account_id uuid not null references public.internal_wallet_accounts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  counterparty_user_id uuid not null references auth.users(id) on delete restrict,
  reference text not null,
  direction text not null check (direction in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  description text not null default 'Internal transfer',
  status text not null default 'completed' check (status in ('completed')),
  created_at timestamptz not null default now(),
  unique (transfer_id, direction, account_id)
);

create index if not exists internal_transactions_user_created_idx
  on public.internal_transactions(user_id, created_at desc);
create index if not exists internal_transactions_transfer_idx
  on public.internal_transactions(transfer_id);

alter table public.internal_wallet_accounts enable row level security;
alter table public.internal_transactions enable row level security;

drop policy if exists "Users can read own internal wallet" on public.internal_wallet_accounts;
create policy "Users can read own internal wallet"
  on public.internal_wallet_accounts for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can read own internal transactions" on public.internal_transactions;
create policy "Users can read own internal transactions"
  on public.internal_transactions for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.internal_wallet_accounts from anon, authenticated;
grant select on public.internal_wallet_accounts to authenticated;
revoke all on public.internal_transactions from anon, authenticated;
grant select on public.internal_transactions to authenticated;

create or replace function public.create_internal_wallet_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.internal_wallet_accounts(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_internal_wallet_for_user() from public, anon, authenticated;
drop trigger if exists auth_user_create_internal_wallet on auth.users;
create trigger auth_user_create_internal_wallet
after insert on auth.users
for each row execute function public.create_internal_wallet_for_user();

insert into public.internal_wallet_accounts(user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.get_my_internal_wallet()
returns table (id uuid, account_number text, currency char(3), status text, balance_minor bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  insert into public.internal_wallet_accounts(user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  return query
    select w.id, w.account_number, w.currency, w.status,
      coalesce(sum(case when t.direction = 'credit' then t.amount_minor else -t.amount_minor end), 0)::bigint
    from public.internal_wallet_accounts w
    left join public.internal_transactions t on t.account_id = w.id and t.status = 'completed'
    where w.user_id = v_user
    group by w.id, w.account_number, w.currency, w.status;
end;
$$;

create or replace function public.transfer_internal(
  p_recipient_email text,
  p_amount_minor bigint,
  p_description text default null,
  p_idempotency_key uuid default gen_random_uuid()
)
returns table (transfer_id uuid, reference text, amount_minor bigint, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_sender_wallet uuid;
  v_recipient_wallet uuid;
  v_sender_status text;
  v_recipient_status text;
  v_balance bigint;
  v_transfer uuid := p_idempotency_key;
  v_reference text := 'TX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  v_description text := coalesce(nullif(trim(p_description), ''), 'Internal transfer');
begin
  if v_sender is null then raise exception 'Authentication required'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'Enter an amount greater than zero'; end if;
  if p_amount_minor > 100000000000 then raise exception 'Amount exceeds the permitted limit'; end if;
  if p_recipient_email is null or trim(p_recipient_email) = '' then raise exception 'Recipient email is required'; end if;

  select u.id into v_recipient
  from auth.users u
  where lower(u.email) = lower(trim(p_recipient_email))
  limit 1;

  if v_recipient is null then raise exception 'No registered recipient was found for that email'; end if;
  if v_recipient = v_sender then raise exception 'You cannot transfer to your own account'; end if;

  insert into public.internal_wallet_accounts(user_id) values (v_sender) on conflict (user_id) do nothing;
  insert into public.internal_wallet_accounts(user_id) values (v_recipient) on conflict (user_id) do nothing;

  perform w.id
  from public.internal_wallet_accounts w
  where w.user_id in (v_sender, v_recipient)
  order by w.user_id
  for update;

  select id, status into v_sender_wallet, v_sender_status
  from public.internal_wallet_accounts where user_id = v_sender;
  select id, status into v_recipient_wallet, v_recipient_status
  from public.internal_wallet_accounts where user_id = v_recipient;

  if v_sender_status <> 'active' or v_recipient_status <> 'active' then
    raise exception 'Both accounts must be active to transfer';
  end if;

  if exists (select 1 from public.internal_transactions where transfer_id = v_transfer) then
    return query select v_transfer, (select t.reference from public.internal_transactions t where t.transfer_id = v_transfer limit 1), p_amount_minor, 'completed'::text;
    return;
  end if;

  select coalesce(sum(case when t.direction = 'credit' then t.amount_minor else -t.amount_minor end), 0)::bigint
  into v_balance
  from public.internal_transactions t
  where t.account_id = v_sender_wallet and t.status = 'completed';

  if v_balance < p_amount_minor then raise exception 'Insufficient available balance'; end if;

  insert into public.internal_transactions
    (transfer_id, account_id, user_id, counterparty_user_id, reference, direction, amount_minor, description)
  values
    (v_transfer, v_sender_wallet, v_sender, v_recipient, v_reference, 'debit', p_amount_minor, v_description),
    (v_transfer, v_recipient_wallet, v_recipient, v_sender, v_reference, 'credit', p_amount_minor, v_description);

  return query select v_transfer, v_reference, p_amount_minor, 'completed'::text;
end;
$$;

revoke all on function public.get_my_internal_wallet() from public, anon;
grant execute on function public.get_my_internal_wallet() to authenticated;
revoke all on function public.transfer_internal(text, bigint, text, uuid) from public, anon;
grant execute on function public.transfer_internal(text, bigint, text, uuid) to authenticated;
