-- Rename the existing administrator test adjustment reference to the current format.
-- Keep the transaction's amount, status, and audit description unchanged.

update public.internal_transactions
set reference = 'TXN-20261016-7EE18CBA'
where reference = 'TEST-ADJUST-7EE18CBA5963'
  and not exists (
    select 1
    from public.internal_transactions existing
    where existing.reference = 'TXN-20261016-7EE18CBA'
  );
