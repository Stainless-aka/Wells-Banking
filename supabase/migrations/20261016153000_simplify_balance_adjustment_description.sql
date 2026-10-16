-- Use a clear, concise description for administrator balance adjustments.
-- These remain internal ledger adjustments, not external bank deposits.

create or replace function public.admin_adjust_test_wallet_balance(
  p_user_id uuid,
  p_amount_minor bigint,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account_id uuid;
  v_reference text;
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_user_id is null then
    raise exception 'Customer is required';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 100000000000 then
    raise exception 'Amount must be greater than zero and within the allowed limit';
  end if;
  if p_direction not in ('credit', 'debit') then
    raise exception 'Direction must be credit or debit';
  end if;

  insert into public.internal_wallet_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select id into v_account_id
  from public.internal_wallet_accounts
  where user_id = p_user_id
  for update;

  v_reference := 'TXN-' || to_char(now() at time zone 'UTC', 'YYYYMMDD')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.internal_transactions (
    transfer_id, account_id, user_id, counterparty_user_id,
    reference, direction, amount_minor, currency, description, status
  ) values (
    gen_random_uuid(), v_account_id, p_user_id, p_user_id,
    v_reference,
    p_direction, p_amount_minor, 'USD',
    'Account balance adjustment', 'completed'
  );
end;
$function$;

revoke all on function public.admin_adjust_test_wallet_balance(uuid, bigint, text) from public;
grant execute on function public.admin_adjust_test_wallet_balance(uuid, bigint, text) to authenticated;

-- Update the description on existing administrator test-adjustment entries too.
update public.internal_transactions
set description = 'Account balance adjustment'
where description = 'Administrator test balance adjustment';
