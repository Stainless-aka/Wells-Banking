revoke update on table public.customer_accounts from authenticated;
grant update (status) on table public.customer_accounts to authenticated;

revoke update on table public.internal_wallet_accounts from authenticated;
grant update (status) on table public.internal_wallet_accounts to authenticated;
