# Crewmate — Project Map

> **Living document.** Update this file on every session before closing. Any new route, table, component, or integration must be recorded here before the branch is merged.
> Last updated: 2026-04-01

---

## ⚠️ Project Boundary Declaration

**Crewmate is a standalone product. It shares NOTHING with any other project.**

| Boundary | Rule |
|---|---|
| GitHub | Repo is `kameronkh/crewmate` — not a fork, not a monorepo |
| Vercel | Project is `crewmate` under `kameronkhs-projects` — separate from any other Vercel project |
| Supabase | Project is `Crewmate` (`xhoxxpddmpwcrhqapbqz`) — **not the Tystrya CRM project** (`qvfelrqijvvxpookotvr`) |
| Codebase | No shared components, utilities, or config with CellarMate, ArbitrageIQ, or any other app |
| Database | All tables are in the dedicated Crewmate Supabase project — no cross-project queries ever |

> **Tystrya CRM** (`qvfelrqijvvxpookotvr`) lives under the "Ray Ray" Supabase org and is used by other products. Never point Crewmate env vars at it.

---

## What the App Does

Crewmate is a construction crew job-execution platform. Foremen create jobs, assign tasks to workers with estimated hours, and track labor in real time. Workers check in, clock off, and get paid based on **budgeted hours** (not time-card hours), giving them a direct financial incentive to work efficiently. The platform handles pay calculation, on-time bonus logic, gross margin tracking, and crew management.

**Core loop:**
1. Foreman creates a job → adds tasks with estimated hours + assigned worker
2. Worker sees task on their dashboard → checks in → marks complete with actual hours
3. System calculates pay: `base = est_hours × rate`, bonus = 10% if on-time
4. Foreman sees real-time stats: on-time rate, total payouts, bonuses earned

---

## Project Status

| Layer | Status | Notes |
|---|---|---|
| `crewmate-demo-v4.html` | ✅ Feature-complete (v4) | Single-file React demo; source of truth for product features |
| `crewpay-app/` (Next.js) | 🚧 v1 scaffold | Core auth + task flow only; v4 features pending |

**The HTML demo (`crewmate-demo-v4.html`) leads the Next.js app.** All v4 features (Rate Sheet, margin tracking, change orders, team management) exist only in the demo today and need to be ported.

---

## Infrastructure

| Service | Project Name | ID / Slug | URL |
|---|---|---|---|
| GitHub | `crewmate` | `kameronkh/crewmate` | github.com/kameronkh/crewmate |
| Vercel | `crewmate` | `kameronkhs-projects/crewmate` | crewmate-kameronkhs-projects.vercel.app |
| Supabase | `Crewmate` | `xhoxxpddmpwcrhqapbqz` | xhoxxpddmpwcrhqapbqz.supabase.co |

**Deployment trigger:** push to `main` on `kameronkh/crewmate` → Vercel auto-deploys to production.

**git author for Vercel deployments:**
Email must be `27403682+kameronkh@users.noreply.github.com` to match the GitHub account connected to the Vercel Hobby plan.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | TypeScript, `'use client'` on all interactive pages |
| Auth & DB | Supabase | `@supabase/ssr` for cookie-based sessions; RLS on all tables |
| Styling | Tailwind CSS 3 | Utility-first; `.card`, `.btn-primary`, `.btn-secondary`, `.badge-*`, `.input`, `.label` in `globals.css` |
| Deployment | Vercel | Hobby plan; env vars set in Vercel dashboard |
| Language | TypeScript 5 | All types in `lib/types.ts` |

---

## Repository Structure

```
crewpay-app/                         ← root (folder name is historical; project is Crewmate)
├── app/
│   ├── page.tsx                     # / — Login + signup (public)
│   ├── layout.tsx                   # Root layout — metadata, globals.css
│   ├── globals.css                  # Tailwind base + shared component classes
│   ├── foreman/
│   │   ├── layout.tsx               # Foreman shell — sticky nav, sign out
│   │   ├── dashboard/
│   │   │   └── page.tsx             # /foreman/dashboard — jobs, tasks, stats
│   │   └── jobs/
│   │       └── new/
│   │           └── page.tsx         # /foreman/jobs/new — create job + tasks
│   └── worker/
│       └── page.tsx                 # /worker — worker task list + check-in
├── components/
│   └── TaskRow.tsx                  # Shared task card used in foreman dashboard
├── lib/
│   ├── supabase.ts                  # createClient() — browser Supabase client
│   ├── supabase-server.ts           # Server-side Supabase client (RSC / middleware)
│   └── types.ts                    # All TS interfaces + computed helper functions
├── supabase/
│   ├── schema.sql                   # Full DB schema — run in Supabase SQL Editor
│   └── schema_team.sql              # Team/company invite additions (pending)
├── public/                          # Static assets
├── .env.example                     # Required env vars template
├── .env.local                       # Local secrets — NOT committed
├── PROJECT_MAP.md                   # ← You are here
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## Routes & Screen Inventory

### `/` — Login / Sign Up
**File:** `app/page.tsx`
**Role:** Public (unauthenticated)

| Element | Key Functions |
|---|---|
| Mode toggle (Sign In / Sign Up) | `useState<'login' \| 'signup'>` |
| Sign-in form | `supabase.auth.signInWithPassword()` → fetch `profiles.role` → redirect |
| Sign-up form | `supabase.auth.signUp()` → `profiles.insert({ full_name, role, trade, rate_per_hour })` |
| Role picker | `'foreman'` or `'worker'` — determines redirect destination |
| Post-auth redirect (sign-up) | Foreman → `/onboarding`; Worker → `/join` |
| Post-auth redirect (sign-in) | Checks `company_id`: Foreman with company → `/foreman/dashboard`, no company → `/onboarding`; Worker with company → `/worker`, no company → `/join` |

**State:** `email`, `password`, `mode`, `name`, `role`, `trade`, `rate`, `loading`, `error`

---

### `/onboarding` — Foreman Company Setup
**File:** `app/onboarding/page.tsx`
**Role:** Foreman (post sign-up, no company yet)

| Element | Key Functions |
|---|---|
| Company name input | `useState('')` |
| Create company | `companies.insert({ name, owner_id: user.id })` → `profiles.update({ company_id })` |
| Redirect | → `/foreman/dashboard` on success |

**State:** `companyName`, `saving`, `error`

---

### `/join` — Worker Join Company
**File:** `app/join/page.tsx`
**Role:** Worker (post sign-up, no company yet)

| Element | Key Functions |
|---|---|
| Invite code input | `useState('')` — uppercase mono display, max 8 chars |
| Look up company | `companies.select().eq('invite_code', code)` |
| Join company | `profiles.update({ company_id: company.id })` |
| Redirect | → `/worker` on success |

**State:** `inviteCode`, `saving`, `error`

---

### `/foreman/dashboard` — Foreman Dashboard
**File:** `app/foreman/dashboard/page.tsx`
**Role:** Foreman only

| Element | Key Functions |
|---|---|
| Stats bar (3 cards) | `onTimeRate(allTasks)`, `totalPay` reduce, `bonusPay` reduce |
| Active jobs list | Supabase query: `jobs` + nested `tasks(*, worker:profiles(*), payment:payments(*))` |
| Expandable job rows | `useState<string \| null>` for `expanded` job ID |
| Job progress bar | `jobProgress(job)` → `{ done, total, pct }` |
| Task rows | `<TaskRow>` component — check-in, mark complete, pay display |
| Check-in handler | `supabase.from('tasks').update({ status: 'in_progress', checked_in_at })` |
| Complete handler | `supabase.rpc('complete_task', { p_task_id, p_actual_hours })` |

**State:** `jobs: Job[]`, `workers: Profile[]`, `expanded: string | null`, `loading`

**Computed (inline):**
- `allTasks` — flat array from all jobs
- `totalPay` — sum of `est_hours × rate` for all tasks
- `bonusPay` — sum of 10% bonuses on completed on-time tasks
- `onTime` — `onTimeRate(allTasks)` → percentage

---

### `/foreman/jobs/new` — Create Job
**File:** `app/foreman/jobs/new/page.tsx`
**Role:** Foreman only

| Element | Key Functions |
|---|---|
| Job name input | `useState('')` |
| Task builder (inline) | `useState<TaskDraft[]>` — add / remove / update tasks |
| Worker picker (per task) | Loaded from `profiles` where `role = 'worker'` and same `company_id` |
| Estimated hours input | `numeric`, min 0.5, step 0.5 |
| Bonus toggle (per task) | `boolean` — 10% if completed on-time |
| Pay preview (per task) | `previewPay(task)` — `est_hours × rate + 10% bonus` |
| Save | Insert `jobs` → insert all `tasks` in one batch → redirect to dashboard |

**State:** `jobName`, `workers: Profile[]`, `tasks: TaskDraft[]`, `saving`, `error`

**TaskDraft interface:** `{ name, worker_id, estimated_hours, bonus_enabled }`

---

### `/worker` — Worker Task Board
**File:** `app/worker/page.tsx`
**Role:** Worker only

| Element | Key Functions |
|---|---|
| Greeting + summary | `profile.full_name.split(' ')[0]`, active task count, `pendingEarnings` |
| Task cards | Filtered to `worker_id = user.id` and `status != 'completed'` |
| Pay breakdown card | Base pay, on-time bonus, total possible |
| Check-in button | `supabase.from('tasks').update({ status: 'in_progress', checked_in_at })` |
| Mark complete flow | Input actual hours → `supabase.rpc('complete_task', { p_task_id, p_actual_hours })` |
| Sign out | `supabase.auth.signOut()` → `window.location.href = '/'` |

**State:** `profile: Profile | null`, `tasks: Task[]`, `loading`, `completing: string | null`, `actualHours: Record<string, string>`

**Pending earnings formula (displayed to worker):**
```
pendingEarnings = Σ (est_hours × rate) + (bonus_enabled ? base × 0.1 : 0)
```
for all active (non-completed) tasks.

---

### `/foreman/layout.tsx` — Foreman Shell
**File:** `app/foreman/layout.tsx`
**Role:** Wraps all `/foreman/*` routes

Nav links: Dashboard (`/foreman/dashboard`), New Job (`/foreman/jobs/new`)
Mobile: bottom tab bar (hidden on `sm:` and above)
Sign out: `supabase.auth.signOut()` → `router.push('/')`

---

## Shared Component: `TaskRow`
**File:** `components/TaskRow.tsx`
**Used by:** `app/foreman/dashboard/page.tsx`

| Prop | Type | Purpose |
|---|---|---|
| `task` | `Task` | Task data including status, hours, bonus flag |
| `worker` | `Profile \| undefined` | Used to display name, trade, rate; compute pay |
| `onCheckIn` | `() => void` | Callback to parent — parent owns the Supabase call |
| `onComplete` | `(actualHours: number) => void` | Callback — triggers `complete_task` RPC in parent |

**Displays:** task name, status badge, timing delta (X.Xh under / over), worker info, base pay, bonus potential, check-in/complete actions.

**Timing delta logic:**
```ts
actual <= estimated → "X.Xh under" (green)
actual >  estimated → "X.Xh over"  (red)
```

---

## `lib/types.ts` — Type System & Computed Helpers

### Interfaces

| Interface | Key Fields |
|---|---|
| `Profile` | `id, full_name, role, trade, rate_per_hour, company_id` |
| `Company` | `id, name, owner_id` |
| `Job` | `id, company_id, name, status, tasks?: Task[]` |
| `Task` | `id, job_id, name, worker_id, estimated_hours, actual_hours, status, bonus_enabled, checked_in_at, completed_at` |
| `Payment` | `id, task_id, worker_id, base_pay, bonus_pay, total_pay, status` |

### Helper Functions

| Function | Signature | Logic |
|---|---|---|
| `calcBasePay` | `(task, worker) → number` | `task.estimated_hours × worker.rate_per_hour` |
| `calcBonus` | `(task, worker) → number` | 10% of base if `bonus_enabled` and `actual_hours ≤ estimated_hours` and `status = 'completed'` |
| `calcTotal` | `(task, worker) → number` | `calcBasePay + calcBonus` |
| `jobProgress` | `(job) → { done, total, pct }` | Count completed tasks / total tasks × 100 |
| `onTimeRate` | `(tasks[]) → number` | % of completed tasks where `actual_hours ≤ estimated_hours` |

---

## Database Schema

All tables in Supabase project `xhoxxpddmpwcrhqapbqz`. RLS enabled on all tables.

> ✅ **Schema applied 2026-04-02** via Supabase MCP (`initial_schema` migration). All tables and RLS policies are live on `xhoxxpddmpwcrhqapbqz`. Note: `companies` table also has `invite_code text unique` (8-char auto-generated) not in the original schema.sql — update the file if re-running.

### `profiles`
Extends `auth.users`. One row per authenticated user.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid PK | No | FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | text | No | |
| `role` | text | No | `'foreman'` or `'worker'` |
| `trade` | text | Yes | e.g. "Framing", "Electrical" |
| `rate_per_hour` | numeric(8,2) | No | Default 0; worker cost rate for pay calc |
| `company_id` | uuid | Yes | FK → `companies(id)` ON DELETE SET NULL |
| `created_at` | timestamptz | No | Default now() |

### `companies`
One company per foreman account.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid PK | No | Default uuid_generate_v4() |
| `name` | text | No | |
| `owner_id` | uuid | Yes | FK → `profiles(id)` ON DELETE SET NULL |
| `created_at` | timestamptz | No | Default now() |

### `jobs`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid PK | No | |
| `company_id` | uuid | No | FK → `companies(id)` ON DELETE CASCADE |
| `name` | text | No | |
| `status` | text | No | `'active'`, `'completed'`, `'archived'` |
| `created_by` | uuid | Yes | FK → `profiles(id)` ON DELETE SET NULL |
| `created_at` | timestamptz | No | |
| `completed_at` | timestamptz | Yes | |

> Pending v4 additions: `location text`, `contract_value numeric`, `bonus_enabled boolean`

### `tasks`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid PK | No | |
| `job_id` | uuid | No | FK → `jobs(id)` ON DELETE CASCADE |
| `name` | text | No | |
| `worker_id` | uuid | Yes | FK → `profiles(id)` ON DELETE SET NULL |
| `estimated_hours` | numeric(6,2) | No | **Pay basis — worker earns on this, not actual** |
| `actual_hours` | numeric(6,2) | Yes | Null until task completed |
| `status` | text | No | `'pending'`, `'in_progress'`, `'completed'` |
| `bonus_enabled` | boolean | No | Default true; 10% on-time bonus |
| `sort_order` | integer | No | Default 0 |
| `checked_in_at` | timestamptz | Yes | |
| `completed_at` | timestamptz | Yes | |
| `created_at` | timestamptz | No | |

> Pending v4 additions: `miles numeric`, `clock_off_note text`, `rate_code text`

### `payments`
Auto-generated by `complete_task()` RPC when a task is completed.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid PK | No | |
| `task_id` | uuid | No | FK → `tasks(id)` ON DELETE CASCADE |
| `worker_id` | uuid | No | FK → `profiles(id)` ON DELETE CASCADE |
| `base_pay` | numeric(10,2) | No | `estimated_hours × rate_per_hour` |
| `bonus_pay` | numeric(10,2) | No | Default 0; 10% of base if on-time |
| `total_pay` | numeric(10,2) | No | `base_pay + bonus_pay` |
| `status` | text | No | `'pending'`, `'approved'`, `'paid'` |
| `created_at` | timestamptz | No | |

> Pending v4 addition: separate `change_orders` table

---

## DB Function: `complete_task(p_task_id, p_actual_hours)`

Defined in `schema.sql`. Runs as `SECURITY DEFINER` (bypasses RLS).

**Steps:**
1. Fetch task row and its worker's profile
2. `base = estimated_hours × rate_per_hour`
3. If `bonus_enabled AND actual_hours ≤ estimated_hours`: `bonus = base × 0.10`
4. UPDATE `tasks` → `status = 'completed'`, `actual_hours`, `completed_at = now()`
5. INSERT into `payments` with computed values

**Critical design rule:** Pay is calculated on `estimated_hours`, not `actual_hours`. This is intentional — workers are incentivized by speed, not penalized for being fast.

---

## Row-Level Security Policies

| Table | Policy | Rule |
|---|---|---|
| `profiles` | select | User can only read their own row |
| `profiles` | update | User can only update their own row |
| `companies` | select | Members of the company (matching `company_id`) |
| `companies` | insert | `owner_id = auth.uid()` |
| `companies` | update | `owner_id = auth.uid()` |
| `jobs` | select | Same company members |
| `jobs` | insert | Foremen only (role check) |
| `jobs` | update | Foremen only (role check) |
| `tasks` | select | Same company members (via job → company join) |
| `tasks` | insert | Foremen only |
| `tasks` | update | Foremen (any task in their company) OR worker (own tasks only) |
| `payments` | select | Worker sees own; Foreman sees all in their company |
| `payments` | insert | Open (`true`) — handled by `complete_task` security definer fn |

---

## Key Business Logic

### Pay Calculation
Workers are paid on **budgeted hours, not actual hours.** Intentional product decision.

```
base_pay  = estimated_hours × rate_per_hour
bonus_pay = base_pay × 0.10  (if actual_hours ≤ estimated_hours AND bonus_enabled)
total_pay = base_pay + bonus_pay
```

### Gross Margin (v4 demo only — not in Next.js app yet)
```
revenue = completed_tasks.est_hours × worker.targetMarket  (market billing rate)
cost    = completed_tasks.est_hours × worker.rate
profit  = revenue - cost
margin% = profit / revenue × 100
```
Target: 3× multiplier (market rate = 3× worker cost rate).

### Rate Multipliers (v4 demo only)
Stackable, applied to market billing rate:
- OT / Weekend: 1.5× (adjustable)
- Night / Graveyard: 2.0× (adjustable)
- Rush: 1.5× (stackable on top of others)

---

## Environment Variables

```bash
# .env.local — copy from .env.example. Never commit real values.

# Supabase — Crewmate project ONLY (xhoxxpddmpwcrhqapbqz)
# Get keys from: supabase.com → Crewmate → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xhoxxpddmpwcrhqapbqz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase Crewmate project>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # Change to prod URL before deploying
```

**Vercel:** Both env vars are already set in the `crewmate` Vercel project dashboard.
**⚠️ Never use the Tystrya CRM Supabase URL/key (`qvfelrqijvvxpookotvr`) in this project.**

---

## Auth Flow

```
User hits /
  │
  ├─ Sign Up ──► supabase.auth.signUp()
  │              └─ profiles.insert({ full_name, role, trade, rate_per_hour })
  │              └─ company_id is NULL until company is created (⚠️ gap — see open items)
  │              └─ redirect: role=foreman → /foreman/dashboard | role=worker → /worker
  │
  └─ Sign In ──► supabase.auth.signInWithPassword()
                 └─ fetch profiles.role
                 └─ redirect: foreman → /foreman/dashboard | worker → /worker

Session managed by @supabase/ssr (cookie-based, works with Next.js App Router)
Sign out: supabase.auth.signOut() → redirect to /
RLS: all DB queries auto-scoped to authenticated user's company
```

---

## Development Guardrails

These rules are mandatory for every session working on Crewmate.

### Project Isolation Rules
1. **Never point Crewmate env vars at any other Supabase project.** The correct Supabase project is `xhoxxpddmpwcrhqapbqz`. The Tystrya CRM project (`qvfelrqijvvxpookotvr`) is for other products only.
2. **Never copy files from CellarMate, ArbitrageIQ, or any other project.** Crewmate has its own lib/, components/, and types.
3. **Never deploy Crewmate from any Vercel project other than `crewmate` under `kameronkhs-projects`.** Check `vercel.json` or Vercel dashboard before any deployment config changes.
4. **This repo is `kameronkh/crewmate`.** Do not push to any other repository.

### Development Process Rules
5. **One feature at a time.** Branch → implement → test → commit → merge. No stacking unrelated changes.
6. **Never commit directly to `main`.** All work goes through a feature branch and merges via PR or fast-forward after testing.
7. **Test every change before committing.** Run locally with `npm run dev` and verify the affected flow end-to-end.
8. **Diagnose before rewriting.** Read the actual error message. Patch the minimum code needed.
9. **Run schema.sql before testing auth.** If pointing at a fresh Supabase project, the schema must be applied first or sign-up will fail silently.
10. **Update this file** when adding any route, table, component, or external integration.

### Schema Rules
11. **Never apply schema changes directly to the production Supabase project without a backup.** Test migrations on a branch project first.
12. **All new tables must have RLS enabled** and at least one policy before merging.
13. **The `complete_task` function must remain `SECURITY DEFINER`** so it can write to `payments` regardless of the caller's RLS context.

### UI / Styling Rules
14. **Use the existing CSS class system** — `.card`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.badge-*`, `.input`, `.label` — defined in `globals.css`. Do not inline equivalent styles.
15. **Mobile-first.** The worker view is used on phones. Test at 375px width.

---

## Branch Strategy

| Branch | Purpose | Merge target |
|---|---|---|
| `main` | Production — auto-deploys to Vercel | — |
| `feature/<name>` | New features (e.g. `feature/rate-sheet`) | `main` via PR |
| `fix/<name>` | Bug fixes (e.g. `fix/auth-redirect`) | `main` via PR |
| `chore/<name>` | Config, docs, refactors (e.g. `chore/update-project-map`) | `main` via PR |
| `schema/<name>` | DB migrations (e.g. `schema/add-change-orders`) | `main` — apply to Supabase manually |

---

## v4 Feature Backlog (demo → Next.js app)

Features that exist in `crewmate-demo-v4.html` and need to be ported:

- [ ] **Company onboarding** — After foreman signs up, prompt to create company; set `profiles.company_id`
- [ ] **Rate Sheet tab** — Editable market rate + cost rate per trade; OT/night/rush multipliers; CSV export; competitive benchmarks (residential vs. commercial); rate as task picklist
- [ ] **Gross margin per job** — Revenue from completed tasks × billing rate vs. worker cost
- [ ] **Change order flow** — Worker submits change order → pending badge → foreman approves/rejects
- [ ] **Worker profile page** — Avg effective pay rate; below-margin flag; earnings history
- [ ] **Jobs list enhancements** — Location field; contract value; mileage tracking ($0.67/mi IRS rate)
- [ ] **Dashboard additions** — Labor margin stat; margin-flagged workers list; quick-add task inline
- [ ] **Clock-off note** — Required note when task is submitted incomplete
- [ ] **DB schema additions:**
  - `jobs.location text`
  - `jobs.contract_value numeric`
  - `jobs.bonus_enabled boolean`
  - `tasks.miles numeric`
  - `tasks.clock_off_note text`
  - `tasks.rate_code text`
  - New table: `change_orders`
  - New table: `rate_sheet`

---

## Immediate Next Steps (Blocking)

Before the live app can accept real users:

1. **Apply schema** → Supabase dashboard → Crewmate project (`xhoxxpddmpwcrhqapbqz`) → SQL Editor → paste `supabase/schema.sql` → Run
2. **Build company onboarding** → After foreman sign-up, `profiles.company_id` is null. Foreman needs to create a company before they can create jobs. This is the top priority bug.
3. **End-to-end test** → Sign up as foreman → create company → create job + tasks → sign up as worker → check in → complete task → verify payment record created

---

## Open Issues

| # | Issue | Priority | Status |
|---|---|---|---|
| 1 | Schema not applied to live Supabase project | 🔴 Blocking | ✅ Done 2026-04-02 |
| 2 | No company creation flow after foreman sign-up | 🔴 Blocking | ✅ Done 2026-04-02 — `/onboarding` |
| 3 | Worker sign-up: `company_id` is null — worker can't see jobs | 🔴 Blocking | ✅ Done 2026-04-02 — `/join` |
| 4 | No worker invite / join-company flow | 🟡 High | ✅ Done 2026-04-02 — invite code on dashboard |
| 5 | Rate Sheet not in Next.js app | 🟡 High | Open |
| 6 | Gross margin tracking not in Next.js app | 🟡 High | Open |
| 7 | Change order flow not in Next.js app | 🟠 Medium | Open |
| 8 | No payment approval UI for foreman | 🟠 Medium | Open |
| 9 | Foreman dashboard doesn't filter by `role` on redirect | 🟢 Low | Open |

---

## Session History

| Date | Branch | What was done |
|---|---|---|
| 2026-03-31 | `main` | Initial Next.js scaffold: auth, foreman dashboard, new job page, worker page, Supabase schema |
| 2026-03-31 | `main` | Vercel deployment wired; GitHub repo created as `crewpay` |
| 2026-04-01 | `chore/rename-to-crewmate` | Renamed all `crewpay`/`CrewPay` references to `crewmate`/`Crewmate`; GitHub repo renamed; Vercel project renamed; new dedicated Supabase project `xhoxxpddmpwcrhqapbqz` created and env vars updated |
| 2026-04-01 | `chore/update-project-map` | Rebuilt PROJECT_MAP.md to full ArbitrageIQ/CellarMate standard with boundary declaration, screen inventory, guardrails, branch strategy, open issues, session history |
| 2026-04-02 | `feature/onboarding` | Applied `initial_schema` migration to live Supabase (incl. `companies.invite_code`). Built `/onboarding` (foreman company creation), `/join` (worker invite code flow). Updated login redirects to route based on `company_id` state. Added invite code card to foreman dashboard. Build clean, deployed READY to production. |
