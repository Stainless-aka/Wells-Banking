# THEOS X DIGITAL TECH Customer Portal

An independent prototype using React, Vite, JavaScript, Supabase Auth, and PostgreSQL to test authentication and private customer records. It is an independent customer portal operated under THEOS X DIGITAL TECH. It does not provide deposit accounts, financial services, or money movement.

## Current scope

- Email/password registration and sign-in using Supabase Auth.
- Email password-reset flow.
- A customer profile and customer-account record created in PostgreSQL when a user registers.
- Row Level Security so authenticated customers can read only their own records.
- Provider-linked bank-account and transaction tables for records later synchronized from a licensed provider.
- No sample data, seed balances, generated bank account numbers, mock transactions, offline demo mode, transfer UI, or transfer RPC.
- Money movement is deliberately disabled until a licensed banking/payment provider has been selected, contractually enabled, and integrated server-side.

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
2. The security hardening migration `202610150001_security_and_auth_hardening.sql` has also been applied to the connected project. For a different project, apply the migrations in timestamp order after reviewing the note in migration 002; do not rerun schema migrations blindly on a database with existing data.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` and in the Vercel deployment environment. Use the project URL and public publishable/anon key only.
4. Configure Auth email confirmation, leaked-password protection, SMTP/email delivery, redirect URLs, and rate limits in Supabase Auth settings.
5. Register a test user using a real email address. The Auth trigger creates a `profiles` row and a `customer_accounts` row with `pending_provider` status. It does not create a deposit account or balance.

Use only the Supabase publishable/anon key in browser environment variables. Never expose a service-role key in frontend code.

## Provider integration boundary

The `bank_accounts` table is for accounts actually provisioned by a provider. The `transactions` table is for provider-sourced transaction records. The frontend has read-only access to records belonging to the signed-in customer. There are no client-side write policies for these tables.

Before showing actual bank account details or enabling financial operations, the next implementation phase must:
1. Select a licensed provider appropriate for the operating country and product.
2. Complete provider onboarding, business verification, and required approvals.
3. Implement authenticated server-side provider API calls and signed webhook verification.
4. Verify provider events, ownership, idempotency, replay protection, reconciliation, and audit logging.
5. Add deposits, withdrawals, transfers, or payment flows only where the provider explicitly supports them and after security review.

Do not manually seed fictional balances or transactions into a real environment. A customer-account row is an application record, not a deposit account, and a provider-reported balance is shown only when one exists in the database.

## Deployment

Deploy the frontend to Vercel and set the two public Supabase environment variables in the project settings. Apply the SQL migration before enabling signups. Configure Supabase Auth redirect URLs for the production domain. A frontend build passing does not replace security review or a production integration test.

## Brand and regulatory note

This is an independent, unofficial prototype. It is not affiliated with, endorsed by, or operated by THEOS X DIGITAL TECH. The name is used only to identify the requested prototype; this project must not be presented as an official official service of another financial institution or collect credentials for another financial institution. Use only branding and services you are authorized to represent. This codebase does not make the operator a bank or authorize deposit-taking or money transmission.
