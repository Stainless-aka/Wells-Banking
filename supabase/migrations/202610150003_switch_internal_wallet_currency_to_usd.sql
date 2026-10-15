-- Switch the internal application ledger to USD.
-- Applied to the connected Supabase project separately.
do $$
begin
  if exists (select 1 from public.internal_transactions) then
    raise exception 'Existing internal transactions require currency reconciliation before switching to USD.';
  end if;
end $$;

alter table public.internal_wallet_accounts
  drop constraint if exists internal_wallet_accounts_currency_check;

alter table public.internal_transactions
  drop constraint if exists internal_transactions_currency_check;

update public.internal_wallet_accounts set currency = 'USD';

alter table public.internal_wallet_accounts
  alter column currency set default 'USD',
  add constraint internal_wallet_accounts_currency_check check (currency = 'USD');

alter table public.internal_transactions
  alter column currency set default 'USD',
  add constraint internal_transactions_currency_check check (currency = 'USD');
