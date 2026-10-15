create table if not exists public.beneficiary_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 150),
  bank_name text not null check (char_length(trim(bank_name)) between 2 and 150),
  account_number text not null check (char_length(trim(account_number)) between 4 and 34),
  swift_bic text not null
    check (swift_bic ~ '^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$'),
  bank_address text not null check (char_length(trim(bank_address)) between 3 and 300),
  country text not null check (char_length(trim(country)) between 2 and 100),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  notification_mode text not null check (notification_mode in ('support', 'review', 'normal')),
  notification_category text not null default 'VAT' check (notification_category in ('VAT', 'COT', 'IRS')),
  request_status text not null default 'submitted'
    check (request_status in ('submitted', 'support_notice', 'under_review')),
  created_at timestamptz not null default now()
);

alter table public.beneficiary_transfer_requests enable row level security;
revoke all on public.beneficiary_transfer_requests from anon, authenticated;
grant select, insert on public.beneficiary_transfer_requests to authenticated;

drop policy if exists "Customers can read their own beneficiary requests"
  on public.beneficiary_transfer_requests;
create policy "Customers can read their own beneficiary requests"
  on public.beneficiary_transfer_requests for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers can create their own beneficiary requests"
  on public.beneficiary_transfer_requests;
create policy "Customers can create their own beneficiary requests"
  on public.beneficiary_transfer_requests for insert to authenticated
  with check (auth.uid() = user_id);
