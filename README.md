# THEOS X DIGITAL TECH Customer Portal

An independent account portal built with React, Vite, JavaScript, Supabase Auth, and PostgreSQL. It includes an application-only internal ledger for transfers between registered users. It is not a bank and does not access Wells Fargo or other external bank accounts.

## Current scope

- Email/password registration and sign-in using Supabase Auth.
- Email password-reset flow.
- A customer profile and customer-account record created in PostgreSQL when a user registers.
- Row Level Security so authenticated customers can read only their own records.
- Provider-linked bank-account and transaction tables reserved for verified records synchronized from an authorized provider.
- Internal wallet accounts and a double-entry ledger stored in Supabase for app-to-app transfers.
- Atomic transfer RPC with balance checks, account locking, unique transfer references, and Row Level Security.
- Internal wallets start at zero; no fake opening balances or deposits are generated. A transfer fails if the sender has insufficient available ledger balance.
- No external-bank transfer, cash withdrawal, deposit, or Wells Fargo integration is provided.

## Stack

- React + Vite + JavaScript
- Supabase Auth + PostgreSQL + Row Level Security
- Responsive CSS and ESLint

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill in the Supabase URL and publishable/anon key in .env.local
npm run dev
```

Without valid Supabase settings, the app does not fall back to a demo. Authentication is disabled and the configuration issue is displayed. Run checks with:

```bash
npm run lint
npm run build
```

## Configure Supabase

1. The connected Supabase project is already configured and has the first two schema migrations applied.
2. The security hardening migration `202610150001_security_and_auth_hardening.sql` and internal ledger migration `202610150002_internal_wallet_ledger_and_transfers.sql` have been applied to the connected project. For a different project, review and apply all migrations in timestamp order.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` and in the Vercel deployment environment. Use the project URL and public publishable/anon key only.
4. Configure Auth email confirmation, leaked-password protection, SMTP/email delivery, redirect URLs, and rate limits in Supabase Auth settings.
5. Register a test user using a real email address. The Auth trigger creates a `profiles` row and a `customer_accounts` row with `pending_provider` status. A separate trigger creates an internal app wallet with a zero balance; this is not a bank deposit account.

Use only the Supabase publishable/anon key in browser environment variables. Never expose a service-role key in frontend code.

## Transaction and provider boundaries

The `internal_wallet_accounts` and `internal_transactions` tables support internal app-to-app ledger transfers. Users can read only their own wallet and ledger rows; transfer writes are performed by the `transfer_internal` database function. Each transfer creates a debit and matching credit in one database transaction. Wallet balance is derived from completed ledger entries.

The `bank_accounts` table is reserved for accounts actually provisioned by a provider. The `transactions` table is reserved for provider-sourced transaction records. The internal ledger is separate from external bank data.

Before enabling deposits, withdrawals, or transfers to real bank accounts, the next implementation phase must:
1. Select a licensed provider appropriate for the operating country and product.
2. Complete provider onboarding, business verification, and required approvals.
3. Implement authenticated server-side provider API calls and signed webhook verification.
4. Verify provider events, ownership, idempotency, replay protection, reconciliation, and audit logging.
5. Add deposits, withdrawals, transfers, or payment flows only where the provider explicitly supports them and after security review.

Do not manually seed fictional balances or transactions into a real environment. A customer-account row is an application record, not a deposit account, and a provider-reported balance is shown only when one exists in the database.

## Deployment

Deploy the frontend to Vercel and set the two public Supabase environment variables in the project settings. Apply the SQL migration before enabling signups. Configure Supabase Auth redirect URLs for the production domain. A frontend build passing does not replace security review or a production integration test.

## Brand and regulatory note

This is an independent application operated under THEOS X DIGITAL TECH. It is not affiliated with, endorsed by, or operated by Wells Fargo or another financial institution. Do not collect credentials for another financial institution or present this app as an official Wells Fargo service. Use only branding and services you are authorized to represent. This codebase does not make the operator a bank or authorize deposit-taking or money transmission.
