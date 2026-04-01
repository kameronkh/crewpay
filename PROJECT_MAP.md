# Crewmate — Project Map

> **Living document.** Update this file whenever a new route, table, component, or integration is added.
> Last updated: 2026-04-01

---

## What the App Does

Crewmate is a construction crew job-execution platform. Foremen create jobs, assign tasks to workers, and track labor in real time. Workers check in, clock off, and get paid based on budgeted hours — giving them a direct incentive to work efficiently. The app handles pay calculation, bonus logic, margin tracking, and crew management.

---

## Project Status

| Layer | Status | Notes |
|---|---|---|
| `crewmate-demo-v4.html` | ✅ Feature-complete (v4) | Single-file React demo, opens directly in browser |
| `crewmate-app/` | 🚧 v1 scaffold | Next.js + Supabase app; core auth + task flow only |

**The HTML demo (`crewmate-demo-v4.html`) is the source of truth for product features.** The Next.js app needs to catch up. All v4 features exist only in the demo today.

---

## Tech Stack

### HTML Demo (`crewmate-demo-v4.html`)
- React 18 via Babel standalone (no build step — opens directly in browser)
- All state in-memory (no backend)
- Tailwind CSS via CDN

### Next.js App (`crewmate-app/`)
- **Framework:** Next.js 14 (App Router), TypeScript
- **Auth & Database:** Supabase (auth.users + row-level security)
- **Styling:** Tailwind CSS
- **Deployment target:** Vercel

---

## Infrastructure

| Service | Project Name | ID / Slug | Notes |
|---|---|---|---|
| GitHub | `crewmate` | `kameronkh/crewmate` | Main branch auto-deploys to Vercel |
| Vercel | `crewmate` | `kameronkhs-projects/crewmate` | Production URL below |
| Supabase | `Crewmate` | `xhoxxpddmpwcrhqapbqz` | Dedicated project — not shared |

**Production URL:** `https://crewmate-kameronkhs-projects.vercel.app`

---

## Repository Structure

```
crewmate-app/
├── app/
│   ├── page.tsx                    # Login / signup
│   ├── layout.tsx                  # Root layout (fonts, globals)
│   ├── globals.css                 # Global styles + Tailwind base
│   ├── foreman/
│   │   ├── layout.tsx              # Foreman nav shell (sticky header)
│   │   ├── dashboard/page.tsx      # Active jobs, task list, on-time rate
│   │   └── jobs/new/page.tsx       # Create new job + add tasks
│   └── worker/
│       └── page.tsx                # Worker task list, check-in, clock-off
├── components/
│   └── TaskRow.tsx                 # Shared task row (status, pay, actions)
├── lib/
│   ├── supabase.ts                 # Client-side Supabase client
│   ├── supabase-server.ts          # Server-side Supabase client (RSC/SSR)
│   └── types.ts                   # All TypeScript types + computed helpers
├── supabase/
│   ├── schema.sql                  # Full DB schema (run in Supabase SQL editor)
│   └── schema_team.sql             # Team / company invite schema additions
├── public/                         # Static assets
├── PROJECT_MAP.md                  # ← You are here
├── .env.example                    # Required env vars (copy → .env.local)
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## Routes & Pages

| Route | Role | What it does |
|---|---|---|
| `/` | Public | Login + signup. Role picker (foreman/worker). Redirects after auth. |
| `/foreman/dashboard` | Foreman | Lists active jobs, expandable task list per job, on-time rate, worker assignment |
| `/foreman/jobs/new` | Foreman | Create job + add tasks inline with worker assignment |
| `/worker` | Worker | Worker's assigned task list — check in, clock off, view pay |

> **v4 Demo routes not yet in Next.js app:**
> - Rate Sheet (market rates, OT/night/rush multipliers, CSV export)
> - Team management (add worker, invite link, margin flags)
> - Jobs list with gross margin per project
> - Change order request + foreman approval flow

---

## Database Tables

All tables live in Supabase (`xhoxxpddmpwcrhqapbqz`). Row-level security is enabled on every table.

> ⚠️ **Schema not yet applied to the Crewmate Supabase project.** Run `supabase/schema.sql` in the SQL Editor before the app will function.

### `profiles`
Extends `auth.users`. One row per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | FK → auth.users |
| `full_name` | text | |
| `role` | text | `'foreman'` or `'worker'` |
| `trade` | text | e.g. "Framing", "Electrical" |
| `rate_per_hour` | numeric | Worker's cost rate (used for pay calc) |
| `company_id` | uuid | FK → companies |

### `companies`
One company per foreman account (created on first login).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `owner_id` | uuid | FK → profiles |

### `jobs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `company_id` | uuid | FK → companies |
| `name` | text | |
| `status` | text | `active`, `completed`, `archived` |
| `created_by` | uuid | FK → profiles |
| `completed_at` | timestamptz | nullable |

> **Pending v4 additions:** `location text`, `contract_value numeric`, `bonus_enabled boolean`

### `tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `job_id` | uuid | FK → jobs |
| `name` | text | |
| `worker_id` | uuid | FK → profiles (nullable) |
| `estimated_hours` | numeric | **Pay basis** — worker earns on this, not actual |
| `actual_hours` | numeric | Nullable until task is completed |
| `status` | text | `pending`, `in_progress`, `completed` |
| `bonus_enabled` | boolean | Inherited from job-level toggle |
| `checked_in_at` | timestamptz | |
| `completed_at` | timestamptz | |

> **Pending v4 additions:** `miles numeric`, `clock_off_note text`, `rate_code text`

### `payments`
Auto-generated when a task is completed.

| Column | Type | Notes |
|---|---|---|
| `task_id` | uuid | FK → tasks |
| `worker_id` | uuid | FK → profiles |
| `base_pay` | numeric | `estimated_hours × rate_per_hour` |
| `bonus_pay` | numeric | 10% of base if on time |
| `total_pay` | numeric | |
| `status` | text | `pending`, `approved`, `paid` |

> **Pending v4 addition:** separate `change_orders` table

---

## Auth Flow

1. User lands on `/` (login/signup)
2. **Sign up:** Creates `auth.users` entry via Supabase, then inserts into `profiles` (name, role, trade, rate)
3. **Login:** `supabase.auth.signInWithPassword` → fetches `profiles.role` → redirects to `/foreman/dashboard` or `/worker`
4. **Session:** Managed by `@supabase/ssr` — cookies persisted server-side
5. **Sign out:** Clears session, redirects to `/`
6. **RLS:** All DB queries are automatically scoped — workers can only see their own tasks; foremen see their company's data

---

## Key Business Logic

### Pay Calculation (intentional design)
Workers are paid on **budgeted hours, not actual hours**. This incentivizes speed.

```
base_pay   = estimated_hours × rate_per_hour
bonus_pay  = base_pay × 0.10  (only if actual_hours ≤ estimated_hours AND job.bonus_enabled)
total_pay  = base_pay + bonus_pay
```

### Gross Margin (v4 demo logic — not yet in Next.js app)
Margin is calculated from **completed tasks only**, using contractor billing rates (not worker wages).

```
revenue = completed_task.est_hours × worker.targetMarket   (market billing rate)
cost    = completed_task.est_hours × worker.rate
profit  = revenue - cost
margin% = profit / revenue × 100
```

Target: 3× multiplier (market rate = 3× worker cost rate).

### Rate Multipliers (v4 demo — not yet in Next.js app)
Stackable multipliers applied to market rates:
- OT / Weekend: default 1.5× (adjustable)
- Night / Graveyard: default 2.0× (adjustable)
- Rush: default 1.5× (stackable on top of others)

---

## Computed Helpers (`lib/types.ts`)

| Function | Description |
|---|---|
| `calcBasePay(task, worker)` | `estimated_hours × rate_per_hour` |
| `calcBonus(task, worker)` | 10% of base if completed on time and bonus enabled |
| `calcTotal(task, worker)` | `base + bonus` |
| `jobProgress(job)` | `{ done, total, pct }` from task statuses |
| `onTimeRate(tasks)` | % of completed tasks finished under estimated hours |

---

## Environment Variables

```bash
# .env.local (copy from .env.example — never commit real values)

# Supabase — Crewmate project (xhoxxpddmpwcrhqapbqz)
# Get from: supabase.com → Crewmate project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xhoxxpddmpwcrhqapbqz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000    # change to prod URL on deploy
```

> ⚠️ **These are already set in Vercel** for the production deployment. For local dev, copy `.env.example` → `.env.local` and fill in real values.

---

## External APIs & Services

| Service | Purpose | Where configured |
|---|---|---|
| Supabase | Auth, database, RLS | supabase.com → Crewmate project |
| Vercel | Deployment | vercel.com → kameronkhs-projects/crewmate |
| GitHub | Source control + CI | github.com/kameronkh/crewmate |

---

## v4 Feature Backlog (demo → Next.js app)

These features exist in `crewmate-demo-v4.html` and need to be built into the Next.js app:

- [ ] **Rate Sheet tab** — editable market rate + cost rate, OT/night/rush multipliers, CSV export, competitive market benchmarks (residential vs. commercial), rate as task picklist
- [ ] **Gross margin per job** — revenue from completed tasks × billing rate
- [ ] **Change order flow** — worker submits → pending badge → foreman approves/rejects
- [ ] **Worker profile** — avg effective pay rate, below-margin flag
- [ ] **Jobs list enhancements** — location field, mileage tracking ($0.67/mi IRS rate)
- [ ] **Dashboard** — labor margin stat, on-time tracking, quick-add task inline
- [ ] **Bonus toggle** — job-level; visible to worker on task card
- [ ] **Clock-off note** — required note when task is incomplete at clock-off
- [ ] **DB schema additions** — `jobs.location`, `jobs.contract_value`, `jobs.bonus_enabled`, `tasks.miles`, `tasks.clock_off_note`, `tasks.rate_code`, new `change_orders` table, new `rate_sheet` table

---

## Immediate Next Steps

Before the app can accept sign-ups on production:

1. **Run the schema** — open Supabase → Crewmate project (`xhoxxpddmpwcrhqapbqz`) → SQL Editor → paste `supabase/schema.sql` → Run
2. **Test sign-up flow** — create a foreman account on the live URL
3. **Test worker flow** — create a worker account, assign a task via foreman, check in/out as worker

---

## Development Guardrails

This project follows the **Clean Dev Protocol**. Key rules:

1. **One feature at a time** — branch → implement → test → commit → repeat
2. **Test after every change** — don't stack changes without verifying
3. **Branch naming:** `feature/rate-sheet`, `fix/auth-redirect`, `chore/schema-migration`
4. **Never commit to main directly** — all work goes through feature branches
5. **Diagnose before rewriting** — read the error, patch the minimum needed
6. **Update this file** when adding routes, tables, or integrations

Full protocol: `/mnt/.claude/skills/clean-dev-protocol/SKILL.md`
