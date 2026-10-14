-- Wells Banking minimal production-style application schema.
-- This migration intentionally creates NO deposit balances, sample customers, sample
-- bank accounts, sample transactions, transfer functions, or money-movement RPCs.
-- Provider-backed account and transaction records must be written by trusted server
-- integration/webhook code using a server-side key, never by the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider_customer_id text unique,
  status text not null default 'pending_provider'
    check (status in ('pending_provider','active','restricted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- These rows represent accounts provisioned by a provider. The app must not invent
-- account numbers or balances. balance_minor remains NULL until the provider reports it.
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

-- Immutable provider-sourced records. No client-side insert/update/delete grants.
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );

  insert into public.customer_accounts(user_id, status)
  values (new.id, 'pending_provider');

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.customer_accounts enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;

create policy "Customers read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Customers update own profile fields"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Customers read own customer account"
  on public.customer_accounts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Customers read own provider accounts"
  on public.bank_accounts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Customers read transactions for own provider accounts"
  on public.transactions for select to authenticated
  using (
    exists (
      select 1 from public.bank_accounts a
      where a.id = transactions.bank_account_id
        and a.user_id = (select auth.uid())
    )
  );

grant select on public.profiles, public.customer_accounts, public.bank_accounts, public.transactions to authenticated;
grant update(full_name) on public.profiles to authenticated;

-- Explicitly revoke browser write access. Provider sync will be implemented behind
-- a trusted backend/webhook after a licensed provider has been selected.
revoke insert, update, delete on public.customer_accounts from anon, authenticated;
revoke insert, update, delete on public.bank_accounts from anon, authenticated;
revoke insert, update, delete on public.transactions from anon, authenticated;
