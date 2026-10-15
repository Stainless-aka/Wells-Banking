create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.app_admins enable row level security;
revoke all on table public.app_admins from anon, authenticated;
grant select on table public.app_admins to authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

create policy "Admins can view admin assignments"
on public.app_admins for select to authenticated
using (public.is_app_admin());

create policy "Admins read all profiles"
on public.profiles for select to authenticated
using (public.is_app_admin());

create policy "Admins read all customer accounts"
on public.customer_accounts for select to authenticated
using (public.is_app_admin());

create policy "Admins update customer account status"
on public.customer_accounts for update to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "Admins read all provider accounts"
on public.bank_accounts for select to authenticated
using (public.is_app_admin());

create policy "Admins read all provider transactions"
on public.transactions for select to authenticated
using (public.is_app_admin());

create policy "Admins read all internal wallets"
on public.internal_wallet_accounts for select to authenticated
using (public.is_app_admin());

create policy "Admins update internal wallet status"
on public.internal_wallet_accounts for update to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "Admins read all internal transactions"
on public.internal_transactions for select to authenticated
using (public.is_app_admin());

insert into public.app_admins (user_id)
select id from auth.users
where lower(email) = lower('ayuskid15@gmail.com')
on conflict (user_id) do nothing;
