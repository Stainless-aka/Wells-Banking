-- Persistent two-way support conversations.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'admin')),
  message text not null check (char_length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_request_created_idx
  on public.support_messages (request_id, created_at);

alter table public.support_messages enable row level security;
grant select, insert on public.support_messages to authenticated;

drop policy if exists "Customers can read their support conversation" on public.support_messages;
create policy "Customers can read their support conversation"
  on public.support_messages for select to authenticated
  using (
    sender_role in ('customer', 'admin')
    and exists (
      select 1 from public.support_requests r
      where r.id = support_messages.request_id
        and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can read all support conversations" on public.support_messages;
create policy "Admins can read all support conversations"
  on public.support_messages for select to authenticated
  using (public.is_app_admin());

drop policy if exists "Customers can send support messages" on public.support_messages;
create policy "Customers can send support messages"
  on public.support_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = 'customer'
    and exists (
      select 1 from public.support_requests r
      where r.id = support_messages.request_id
        and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can send support messages" on public.support_messages;
create policy "Admins can send support messages"
  on public.support_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = 'admin'
    and public.is_app_admin()
  );

-- A customer reply reopens a resolved/closed request for follow-up.
create or replace function public.reopen_support_request_on_customer_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_role = 'customer' then
    update public.support_requests
    set status = 'in_progress', updated_at = now()
    where id = new.request_id
      and status in ('resolved', 'closed');
  end if;
  return new;
end;
$$;

drop trigger if exists support_message_reopen_request on public.support_messages;
create trigger support_message_reopen_request
after insert on public.support_messages
for each row execute function public.reopen_support_request_on_customer_reply();

alter table public.support_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
