-- Harden application functions and repair records for already-registered Auth users.
-- This migration does not create fictional customers, bank accounts, balances, or transactions.

-- This event-trigger function is intended for database DDL automation, not the REST/RPC API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Ensure users created before the signup trigger was installed have their own app records.
insert into public.profiles (id, full_name, email)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', ''),
       coalesce(u.email, '')
from auth.users u
on conflict (id) do update
set email = excluded.email,
    full_name = case
      when excluded.full_name <> '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = pg_catalog.now();

insert into public.customer_accounts (user_id, status)
select u.id, 'pending_provider'
from auth.users u
on conflict (user_id) do nothing;

-- Keep updated_at current for profile edits and trusted provider/customer-account updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists customer_accounts_set_updated_at on public.customer_accounts;
create trigger customer_accounts_set_updated_at
before update on public.customer_accounts
for each row execute function public.set_updated_at();

drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function public.set_updated_at();
