create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;
grant select, insert, update on public.app_settings to authenticated;

drop policy if exists "Authenticated users can read transfer notification setting"
  on public.app_settings;
create policy "Authenticated users can read transfer notification setting"
  on public.app_settings for select to authenticated
  using (key = 'transfer_notification');

drop policy if exists "Admins can insert app settings" on public.app_settings;
create policy "Admins can insert app settings"
  on public.app_settings for insert to authenticated
  with check (public.is_app_admin());

drop policy if exists "Admins can update app settings" on public.app_settings;
create policy "Admins can update app settings"
  on public.app_settings for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

insert into public.app_settings (key, value)
values ('transfer_notification', '{"mode":"support","category":"VAT"}'::jsonb)
on conflict (key) do nothing;
