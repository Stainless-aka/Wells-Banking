-- Upgrade installations that may have run the earlier demo schema.
-- Removes simulated transfer RPCs and demo-only tables/data, then ensures the
-- provider-backed read-only schema is present. Do not apply to an environment that
-- already contains real provider records in the old schema; review and reconcile first.

drop function if exists public.transfer_demo_funds(uuid, text, bigint, text, text);
drop function if exists public.admin_set_account_status(uuid, text);
drop function if exists public.is_admin() cascade;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bank_accounts' and column_name = 'account_number'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bank_accounts' and column_name = 'provider_account_id'
  ) then
    -- The earlier schema represented synthetic balances and fake account numbers.
    drop table if exists public.ledger_entries cascade;
    drop table if exists public.audit_logs cascade;
    drop table if exists public.transactions cascade;
    drop table if exists public.bank_accounts cascade;
    drop table if exists public.user_roles cascade;
  end if;
end;
$$;

create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider_customer_id text unique,
  status text not null default 'pending_provider'
    check (status in ('pending_provider','active','restricted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  account_number_masked text,
  account_type text,
  currency char(3) not null,
  balance_minor bigint,
  balance_as_of timestamptz,
  status text not null check (status in ('pending','active','restricted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_account_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  provider text not null,
  provider_transaction_id text not null,
  reference text,
  type text not null,
  status text not null check (status in ('pending','posted','reversed','failed')),
  direction text not null check (direction in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  description text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_transaction_id)
);

create index if not exists customer_accounts_user_idx on public.customer_accounts(user_id);
create index if not exists bank_accounts_user_created_idx on public.bank_accounts(user_id, created_at desc);
create index if not exists transactions_account_posted_idx on public.transactions(bank_account_id, posted_at desc);

drop trigger if exists on_auth_user_created on auth.users;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, email)
  values(new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when excluded.full_name <> '' then excluded.full_name else public.profiles.full_name end,
    updated_at = now();

  insert into public.customer_accounts(user_id, status)
  values(new.id, 'pending_provider')
  on conflict (user_id) do nothing;

  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.customer_accounts enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Customers read own profile" on public.profiles;
create policy "Customers read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "Customers update own profile fields" on public.profiles;
create policy "Customers update own profile fields" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "Customers read own customer account" on public.customer_accounts;
create policy "Customers read own customer account" on public.customer_accounts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Customers read own provider accounts" on public.bank_accounts;
create policy "Customers read own provider accounts" on public.bank_accounts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Customers read transactions for own provider accounts" on public.transactions;
create policy "Customers read transactions for own provider accounts" on public.transactions for select to authenticated using (
  exists (select 1 from public.bank_accounts a where a.id = transactions.bank_account_id and a.user_id = (select auth.uid()))
);

grant select on public.profiles, public.customer_accounts, public.bank_accounts, public.transactions to authenticated;
grant update(full_name) on public.profiles to authenticated;
revoke insert, update, delete on public.customer_accounts from anon, authenticated;
revoke insert, update, delete on public.bank_accounts from anon, authenticated;
revoke insert, update, delete on public.transactions from anon, authenticated;
