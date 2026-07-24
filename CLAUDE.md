# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm start        # Production start
```

## Architecture

**APR Hub** is a Brazilian digital marketing agency management system built with Next.js 14 App Router, TypeScript, and Supabase (PostgreSQL).

### Authentication

Custom cookie-based auth — middleware (`middleware.ts`) protects all routes except `/login`, `/api/login`, `/api/logout`. Login validates against `APR_PASSWORD` env var and sets an httpOnly `apr_auth` cookie. The cookie token is compared against `APR_AUTH_SECRET`.

### Pages & Routing

- `/` — Home, performs auth check and routing
- `/financeiro` — Financial management dashboard (PJ/PF accounting)
- `/dash/[code]` — Dynamic client dashboard by client code
- `/dossie/[code]` — Client dossier/profile
- `/form/[code]` — Dynamic client intake forms

### Component Structure

All heavy UI lives in `/components/`. Key components:
- `HubApp.tsx` — Main app shell managing clients, tasks, meetings, navigation (~1400 lines)
- `DashboardManager.tsx` — Dashboard metrics/KPI tracking
- `Financeiro.tsx` — PJ/PF financial tracking
- `ProximasAcoes.tsx` — Task management (kanban: A Fazer / Fazendo / Feito)
- `Prospects.tsx` — Lead pipeline
- `BancoEstrategias.tsx` — Strategy/knowledge base
- `Dossies.tsx` — Client profiles

### API Routes (`/app/api/`)

- `login/` — Validates password, sets 30-day cookie
- `logout/` — Clears cookie
- `financeiro/` — GET/POST financial data to Supabase (upserts by `month_key`)
- `sync-sheets/` — Cron: syncs Google Sheets → Supabase client dashboards, computes KPIs (CPL, CTR, CPC, ROAS)
- `keep-alive/` — Cron: queries Supabase to prevent idle pause
- `generate-actions/` — Generates action items

### Cron Jobs (Vercel)

Configured in `vercel.json`:
- `/api/sync-sheets` — Daily at 08:00
- `/api/keep-alive` — Every 3 days at 06:00

### Data Layer

Supabase client is initialized in `/lib/supabase.ts`. Server-side API routes use `SUPABASE_SERVICE_ROLE_KEY`. Client-side uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Main financial table: `apr_financeiro` (stores monthly data as JSONB blobs keyed by `month_key`). Other tables: `clients`, `tasks`, `meetings`, `client_dashboards`, `client_funnel`, `client_kpis`, `payments`, `expenses`, `credit_cards`, etc.

Run `SUPABASE_SETUP.sql` in Supabase SQL Editor to initialize the `apr_financeiro` table.

### Constants & Theming

`/lib/constants.ts` — centralized squads, phases, funnel templates, KPI templates, theme colors (dark: `#08080f` bg, `#a78bfa` accent), and formatting helpers `fB()`, `fB2()`, `fN()` for currency/numbers.

## Environment Variables

```
# Required for all environments
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Required for server-side (Vercel / .env.local)
SUPABASE_SERVICE_ROLE_KEY=
APR_PASSWORD=
APR_AUTH_SECRET=          # defaults to "apr-hub-token"
GOOGLE_SHEETS_API_KEY=
CRON_SECRET=              # optional cron job security
```
