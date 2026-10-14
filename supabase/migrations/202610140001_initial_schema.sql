-- Northstar Demo Banking initial schema.
-- Apply through a trusted Supabase SQL Editor or migration workflow.
-- Money is stored as integer minor units (kobo for NGN).

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_number text not null unique,
  account_type text not null check (account_type in ('checking','savings','Everyday Checking','Growth Savings')),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  balance_minor bigint not null default 0 check (balance_minor >= 0),
  status text not null default 'active' check (status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('NS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  initiated_by uuid not null references auth.users(id),
  from_account_id uuid references public.bank_accounts(id),
  to_account_id uuid references public.bank_accounts(id),
  type text not null check (type in ('transfer','demo_funding')),
  status text not null default 'completed' check (status in ('pending','completed','failed')),
  amount_minor bigint not null check (amount_minor > 0),
  memo text check (memo is null or char_length(memo) <= 80),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint transaction_idempotency_unique unique (initiated_by,idempotency_key),
  constraint transaction_accounts_differ check (from_account_id is null or to_account_id is null or from_account_id <> to_account_id)
);
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  account_id uuid not null references public.bank_accounts(id) on delete restrict,
  entry_type text not null check (entry_type in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bank_accounts_user_id_idx on public.bank_accounts(user_id);
create index if not exists transactions_from_account_idx on public.transactions(from_account_id,created_at desc);
create index if not exists transactions_to_account_idx on public.transactions(to_account_id,created_at desc);
create index if not exists transactions_initiated_by_idx on public.transactions(initiated_by,created_at desc);
create index if not exists ledger_entries_account_idx on public.ledger_entries(account_id,created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id,created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name,email)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,''))
  on conflict(id) do update set email=excluded.email,
    full_name=case when excluded.full_name<>'' then excluded.full_name else public.profiles.full_name end,
    updated_at=now();
  insert into public.user_roles(user_id,role) values(new.id,'customer') on conflict(user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "Users read own role" on public.user_roles;
create policy "Users read own role" on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "Owners and admins read accounts" on public.bank_accounts;
create policy "Owners and admins read accounts" on public.bank_accounts for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "Owners and admins read transactions" on public.transactions;
create policy "Owners and admins read transactions" on public.transactions for select to authenticated using(
  initiated_by=auth.uid() or public.is_admin()
  or exists(select 1 from public.bank_accounts a where a.id=from_account_id and a.user_id=auth.uid())
  or exists(select 1 from public.bank_accounts a where a.id=to_account_id and a.user_id=auth.uid())
);
drop policy if exists "Owners and admins read ledger entries" on public.ledger_entries;
create policy "Owners and admins read ledger entries" on public.ledger_entries for select to authenticated using(
  public.is_admin() or exists(select 1 from public.bank_accounts a where a.id=account_id and a.user_id=auth.uid())
);
drop policy if exists "Admins read audit logs" on public.audit_logs;
create policy "Admins read audit logs" on public.audit_logs for select to authenticated using(public.is_admin());

grant select on public.profiles,public.user_roles,public.bank_accounts,public.transactions,public.ledger_entries to authenticated;
grant select on public.audit_logs to authenticated;
grant update(full_name) on public.profiles to authenticated;
-- Deliberately no client-side writes to roles, accounts, transactions, ledger, or audit records.

create or replace function public.transfer_demo_funds(
  p_from_account uuid,
  p_to_account_number text,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_memo text default null
)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_from public.bank_accounts%rowtype;
  v_to public.bank_accounts%rowtype;
  v_existing public.transactions%rowtype;
  v_tx public.transactions%rowtype;
  v_lock_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount_minor is null or p_amount_minor<=0 then raise exception 'Enter an amount greater than zero'; end if;
  if p_amount_minor>100000000 then raise exception 'Demo transfer limit exceeded'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key))<8 or length(p_idempotency_key)>120 then raise exception 'A valid idempotency key is required'; end if;
  if p_memo is not null and char_length(p_memo)>80 then raise exception 'Memo must be 80 characters or fewer'; end if;

  select * into v_existing from public.transactions where initiated_by=v_user and idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('id',v_existing.id,'reference',v_existing.reference,'status',v_existing.status,'duplicate',true); end if;

  select * into v_from from public.bank_accounts where id=p_from_account and user_id=v_user;
  if not found then raise exception 'Source account not found'; end if;
  select * into v_to from public.bank_accounts where account_number=trim(p_to_account_number);
  if not found then raise exception 'Recipient demo account not found'; end if;
  if v_from.id=v_to.id then raise exception 'Choose a different recipient account'; end if;
  if v_from.currency<>v_to.currency then raise exception 'Accounts must use the same currency'; end if;

  -- Acquire both row locks in a stable order to avoid transfer deadlocks.
  for v_lock_id in
    select a.id from public.bank_accounts a where a.id in(v_from.id,v_to.id) order by a.id for update
  loop
    null;
  end loop;
  select * into v_from from public.bank_accounts where id=p_from_account;
  select * into v_to from public.bank_accounts where id=v_to.id;
  if v_from.user_id<>v_user then raise exception 'Source account ownership changed'; end if;
  if v_from.status<>'active' or v_to.status<>'active' then raise exception 'Both accounts must be active'; end if;
  if v_from.balance_minor<p_amount_minor then raise exception 'Insufficient demo funds'; end if;

  insert into public.transactions(initiated_by,from_account_id,to_account_id,type,status,amount_minor,memo,idempotency_key)
  values(v_user,v_from.id,v_to.id,'transfer','completed',p_amount_minor,nullif(trim(p_memo),''),p_idempotency_key)
  returning * into v_tx;
  update public.bank_accounts set balance_minor=balance_minor-p_amount_minor,updated_at=now() where id=v_from.id;
  update public.bank_accounts set balance_minor=balance_minor+p_amount_minor,updated_at=now() where id=v_to.id;
  insert into public.ledger_entries(transaction_id,account_id,entry_type,amount_minor)
  values(v_tx.id,v_from.id,'debit',p_amount_minor),(v_tx.id,v_to.id,'credit',p_amount_minor);
  insert into public.audit_logs(actor_user_id,action,target_id,metadata)
  values(v_user,'demo_transfer_completed',v_tx.id,jsonb_build_object('from_account_id',v_from.id,'to_account_id',v_to.id,'amount_minor',p_amount_minor));
  return jsonb_build_object('id',v_tx.id,'reference',v_tx.reference,'status',v_tx.status,'duplicate',false);
end;
$$;
revoke all on function public.transfer_demo_funds(uuid,text,bigint,text,text) from public;
grant execute on function public.transfer_demo_funds(uuid,text,bigint,text,text) to authenticated;

-- No public funding RPC exists. Seed demo balances only through trusted admin tooling.


create or replace function public.admin_set_account_status(
  p_account_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_account public.bank_accounts%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('active','suspended') then
    raise exception 'Unsupported account status';
  end if;
  update public.bank_accounts
    set status=p_status,updated_at=now()
    where id=p_account_id
    returning * into v_account;
  if not found then
    raise exception 'Account not found';
  end if;
  insert into public.audit_logs(actor_user_id,action,target_id,metadata)
    values(auth.uid(),'demo_account_status_changed',v_account.id,
      jsonb_build_object('new_status',p_status,'account_number',v_account.account_number));
  return jsonb_build_object('account_id',v_account.id,'status',v_account.status);
end;
$$;
revoke all on function public.admin_set_account_status(uuid,text) from public;
grant execute on function public.admin_set_account_status(uuid,text) to authenticated;


-- New signups receive an empty demo checking account automatically.
-- It is not funded; balances can only be changed by trusted server/database workflows.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name,email)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,''))
  on conflict(id) do update set email=excluded.email,
    full_name=case when excluded.full_name<>'' then excluded.full_name else public.profiles.full_name end,
    updated_at=now();
  insert into public.user_roles(user_id,role) values(new.id,'customer') on conflict(user_id) do nothing;
  if tg_op='INSERT' and not exists(select 1 from public.bank_accounts where user_id=new.id) then
    insert into public.bank_accounts(user_id,account_number,account_type,currency,balance_minor,status)
    values(new.id,'NS'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),'Everyday Checking','NGN',0,'active');
  end if;
  return new;
end;
$$;
