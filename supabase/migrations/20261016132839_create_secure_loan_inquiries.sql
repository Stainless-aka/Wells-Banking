create table if not exists public.loan_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_type text not null check (loan_type in ('home_mortgage', 'mortgage_refinance', 'personal_loan', 'auto_loan', 'student_loan')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 150),
  email text not null check (char_length(trim(email)) between 5 and 254),
  phone text check (phone is null or char_length(trim(phone)) between 7 and 30),
  requested_amount_minor bigint not null check (requested_amount_minor between 100 and 100000000000),
  currency text not null default 'USD' check (currency = 'USD'),
  purpose text not null check (char_length(trim(purpose)) between 3 and 1000),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'contacted', 'approved', 'declined', 'closed')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loan_inquiries_user_created_idx
  on public.loan_inquiries (user_id, created_at desc);
create index if not exists loan_inquiries_status_created_idx
  on public.loan_inquiries (status, created_at desc);

alter table public.loan_inquiries enable row level security;

drop policy if exists "Users can submit their own loan inquiries" on public.loan_inquiries;
create policy "Users can submit their own loan inquiries"
  on public.loan_inquiries for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'submitted' and admin_notes is null);

drop policy if exists "Users can read their own loan inquiries" on public.loan_inquiries;
create policy "Users can read their own loan inquiries"
  on public.loan_inquiries for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins can read loan inquiries" on public.loan_inquiries;
create policy "Admins can read loan inquiries"
  on public.loan_inquiries for select to authenticated
  using ((select public.is_app_admin()));

drop policy if exists "Admins can update loan inquiry workflow" on public.loan_inquiries;
create policy "Admins can update loan inquiry workflow"
  on public.loan_inquiries for update to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

revoke all on public.loan_inquiries from anon, public;
grant select, insert on public.loan_inquiries to authenticated;
grant update (status, admin_notes, updated_at) on public.loan_inquiries to authenticated;

create or replace function public.set_loan_inquiry_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists loan_inquiries_set_updated_at on public.loan_inquiries;
create trigger loan_inquiries_set_updated_at
before update on public.loan_inquiries
for each row execute function public.set_loan_inquiry_updated_at();
