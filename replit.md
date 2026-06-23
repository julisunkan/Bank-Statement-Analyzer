# Bank Statement Analyzer Pro

A full-stack SaaS web platform for bank statement analysis, transaction categorization, budgeting, goal tracking, cashflow forecasting, and admin portal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: JWT (jsonwebtoken) + bcryptjs, stored in localStorage

## Where things live

- `lib/db/src/schema/` — Drizzle schema (users, statements, transactions, categories, budgets, goals, reports, audit_logs)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/` — Orval-generated React Query hooks + Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (auth, statements, transactions, categories, budgets, goals, analytics, subscriptions, forecasts, reports, users, admin)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware (`requireAuth`, `requireAdmin`, `signToken`)
- `artifacts/bank-analyzer/src/` — React + Vite frontend

## Architecture decisions

- Contract-first: OpenAPI spec defines the API, Orval generates typed React Query hooks and Zod schemas from it
- JWT stored in localStorage; Authorization header attached by `custom-fetch.ts`; 401 responses redirect to `/login`
- All routes are prefixed `/api` (served by the API server artifact); the frontend is at `/`
- Default categories seeded once in the DB; users can add custom categories
- Drizzle ORM for all DB access — schema changes go through `pnpm --filter @workspace/db run push`

## Product

- **Auth**: Register / login with JWT tokens
- **Dashboard**: KPI cards, spending overview, top categories, active subscriptions
- **Statements**: Upload bank statements (CSV paste), view and delete
- **Transactions**: Transaction ledger with search and bulk categorization
- **Budgets**: Monthly budget tracking with progress bars per category
- **Goals**: Financial goal tracking (emergency fund, vehicle, home, etc.)
- **Analytics**: Cashflow forecasting, merchant spending intelligence, spending by category
- **Reports**: Generate period-based reports (monthly, quarterly, annual)
- **Admin**: User management, audit logs, platform stats (super_admin role only)

## Demo Credentials

- **Demo user**: `demo@bankanalyzer.com` / `demo123` (pro plan, pre-loaded with transactions)
- **Admin**: `admin@bankanalyzer.com` / `admin123` (super_admin, enterprise plan)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing DB schema in `lib/db/`, always run `pnpm run typecheck:libs` before building the API server — stale lib declarations cause TS2305 errors.
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change to regenerate hooks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
