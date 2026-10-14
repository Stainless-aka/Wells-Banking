# Wells-Banking — Portfolio Demo

A responsive, Wells Fargo-inspired **independent portfolio banking demo** built with React, Vite, JavaScript, and Supabase. It uses original Northstar Demo Banking branding and is not affiliated with Wells Fargo or any financial institution.

> **Demo only:** sample balances are fictional. Never enter real banking credentials or financial information. This project is not a bank and does not process real payments.

## Features

- Responsive banking-style homepage, navigation, service cards, and support content
- Customer dashboard with sample balances, account overview, and recent activity
- Account list and searchable transaction history
- Signup/sign-in through Supabase Auth when configured
- PostgreSQL schema for profiles, roles, accounts, transactions, ledger entries, and audit logs
- Row Level Security for customer data isolation
- Atomic demo-transfer function with ownership checks, row locks, balance validation, ledger entries, and idempotency
- Offline demo mode that works without Supabase credentials

## Stack

- React + Vite + JavaScript
- Supabase Auth + PostgreSQL + Row Level Security
- CSS responsive layouts
- ESLint

## Run locally

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

The app starts in offline demo mode until valid Supabase environment variables are supplied. Run checks before deployment:

\`\`\`bash
npm run lint
npm run build
\`\`\`

## Configure Supabase

1. Create a Supabase project.
2. Apply \`supabase/migrations/202610140001_initial_schema.sql\` in the Supabase SQL Editor or with the Supabase CLI.
3. Copy the project URL and publishable/anon client key into \`.env.local\`.
4. Create a test user through the app.
5. Provision demo accounts through trusted SQL Editor or server-side administrative tooling. Never expose arbitrary account funding to anonymous users.
6. Seed at least two test accounts with distinct account numbers if you want to test transfers.
7. Configure email confirmation for the test environment as appropriate.

Example environment variables:

- \`VITE_SUPABASE_URL\`
- \`VITE_SUPABASE_ANON_KEY\`

Only use synthetic test identities and sample balances. Never put a Supabase service-role key in a frontend environment variable.

## Provisioning demo accounts

After registering a test user, find its UUID in Supabase Auth. Use the SQL Editor to insert two accounts owned by that user. Example (replace the UUID and account numbers with test values):

\`\`\`sql
insert into public.bank_accounts (user_id, account_number, account_type, balance_minor)
values
  ('YOUR_AUTH_USER_UUID', 'DEMO100001', 'Everyday Checking', 28475000),
  ('YOUR_AUTH_USER_UUID', 'DEMO100002', 'Growth Savings', 12500000);
\`\`\`

Create a second test user and account if you want to test transfers between separate customers. Account creation and balance funding are deliberately not exposed through the browser.

## Admin setup

New users receive only the \`customer\` role. To provision an admin, use a trusted SQL Editor session and the exact user UUID:

\`\`\`sql
insert into public.user_roles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;
\`\`\`

Never provide a client-facing endpoint that lets users grant themselves admin access.

## Security notes

- Monetary values are integer minor units (kobo for NGN).
- The browser cannot directly update account balances, ledger entries, roles, or transaction records.
- Transfers execute inside a PostgreSQL transaction; debits, credits, ledger entries, and transaction records succeed or roll back together.
- Row locks and idempotency checks reduce race conditions and duplicate processing.
- RLS restricts account and transaction reads to owners and authorized admins.
- Demo transfers have a fixed maximum amount and require authenticated users.

This is educational demo infrastructure, not a production banking ledger. A real financial service requires independent security review, operational controls, regulatory authorization, and integration with an authorized financial institution.

## Deployment

Deploy the Vite app to Vercel. Set \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` in the project environment settings and apply the SQL migration to Supabase before enabling authenticated workflows.

## Branding

Wells Fargo is referenced only as design inspiration. This project uses original Northstar Demo Banking branding and assets.
