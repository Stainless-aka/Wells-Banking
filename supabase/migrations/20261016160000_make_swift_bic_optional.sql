-- Make SWIFT/BIC optional for beneficiary transfer requests.
alter table public.beneficiary_transfer_requests
  alter column swift_bic drop not null;

alter table public.beneficiary_transfer_requests
  drop constraint if exists beneficiary_transfer_requests_swift_bic_check;

alter table public.beneficiary_transfer_requests
  add constraint beneficiary_transfer_requests_swift_bic_check
  check (
    swift_bic is null
    or trim(swift_bic) = ''
    or swift_bic ~ '^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$'
  );
