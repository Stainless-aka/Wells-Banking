# Wells Banking

A minimal customer account application built with React, Vite, JavaScript, Supabase Auth, and PostgreSQL. This repository provides production-oriented authentication and private, database-backed customer records. It does **not** pretend to be a licensed bank or move money.

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

1. Create a Supabase project.
2. Apply both migrations in timestamp order: `202610140001_initial_schema.sql`, then `202610140002_remove_demo_schema.sql`. The Supabase CLI applies pending migrations in order; if using the SQL Editor, run each file in order.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` and in your deployment environment.
4. Configure Auth email confirmation, password policy, SMTP/email delivery, redirect URLs, and rate limits for the intended environment.
5. Register a test user using a real email address. The Auth trigger creates a `profiles` row and a `customer_accounts` row with `pending_provider` status. It does not create a bank account or balance.

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

This repository name is Wells Banking, but the application must not imply affiliation with Wells Fargo or another financial institution. Use only branding and services you are authorized to represent. This codebase alone does not make the operator a bank or authorize deposit-taking or money transmission.
