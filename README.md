# CrewPay — Job Execution Platform

Per-job pay that keeps construction crews accountable and on schedule.

---

## What It Does

- **Foremen** create jobs, add tasks, assign workers, and set estimated hours + bonus toggles
- **Workers** see their payout upfront, check in to start tasks, and mark them complete
- Pay is calculated automatically: `base = estimated_hours × rate`, `bonus = 10% if on time`
- Dashboard tracks on-time rate, total payouts, and bonuses earned across all active jobs

---

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | Next.js 14 (App Router) |
| Styling   | Tailwind CSS            |
| Database  | Supabase (Postgres)     |
| Auth      | Supabase Auth           |
| Hosting   | Vercel (free tier)      |

---

## Setup (15 minutes)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** — give it a name like "crewpay"
3. Save your database password somewhere safe
4. Wait for the project to spin up (~1 min)

### 2. Run the database schema

1. In your Supabase project, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Paste the entire contents into the SQL Editor and click **Run**
4. You should see "Success. No rows returned"

### 3. Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install dependencies and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the CrewPay login screen.

---

## First Run: Setting Up Your Company

1. **Sign up as a Foreman** — create your account with role = "Foreman / GC"
2. **Create your company** — after sign-up, go to Settings to create your company name
3. **Add workers** — have each worker sign up with role = "Worker / Crew Member"
4. **Link workers to your company** — in Supabase SQL Editor, run:
   ```sql
   update profiles set company_id = 'YOUR_COMPANY_ID' where id = 'WORKER_USER_ID';
   ```
   *(A "Manage Team" UI for this is on the roadmap)*
5. **Create your first job** — click New Job, add tasks, assign workers

---

## Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Your app will be live at `https://your-project.vercel.app` in about 2 minutes.

---

## Project Structure

```
crewpay/
├── app/
│   ├── page.tsx                    # Login / sign-up
│   ├── foreman/
│   │   ├── dashboard/page.tsx      # Foreman dashboard (jobs + stats)
│   │   └── jobs/new/page.tsx       # Create a new job
│   └── worker/
│       └── page.tsx                # Worker view (tasks + check in/out)
├── components/
│   └── TaskRow.tsx                 # Reusable task card with actions
├── lib/
│   ├── types.ts                    # TypeScript types + pay helpers
│   ├── supabase.ts                 # Browser Supabase client
│   └── supabase-server.ts          # Server Supabase client
└── supabase/
    └── schema.sql                  # Full database schema + RLS + functions
```

---

## Pay Logic (core concept)

```
base_pay   = estimated_hours × worker.rate_per_hour
bonus_pay  = base_pay × 0.10  (if actual_hours ≤ estimated_hours AND bonus_enabled)
total_pay  = base_pay + bonus_pay
```

**Why estimated hours for base pay (not actual)?**
Workers know their payout before they start. That's the entire behavioral driver.
Actual hours are tracked for analytics only — not used in pay calculation.

---

## Roadmap

| Phase | Features |
|-------|----------|
| **V1 (now)** | Jobs, tasks, per-job pay, check-in/out, foreman dashboard, worker view |
| **V2** | Team management UI, market rate benchmarking, weather API, task dependencies |
| **V3** | Contractor marketplace, payroll disbursement, Buildertrend/Zapier integration |

---

## Questions?

Built by a construction industry veteran who proved this pay model works in the field —
taking on-time completion from inconsistent to **90–95%**.
