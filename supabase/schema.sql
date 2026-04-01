-- ─────────────────────────────────────────────────────────────────────────────
-- Crewmate Database Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('foreman', 'worker')),
  trade       text,                        -- e.g. "Framing", "Electrical"
  rate_per_hour numeric(8,2) default 0,   -- hourly rate used in pay calc
  company_id  uuid,                        -- set after company is created
  created_at  timestamptz default now()
);

-- ─── COMPANIES ────────────────────────────────────────────────────────────────
create table companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- Back-fill foreign key on profiles
alter table profiles
  add constraint profiles_company_fk
  foreign key (company_id) references companies(id) on delete set null;

-- ─── JOBS ─────────────────────────────────────────────────────────────────────
create table jobs (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  status      text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now(),
  completed_at timestamptz
);

-- ─── TASKS ────────────────────────────────────────────────────────────────────
create table tasks (
  id               uuid primary key default uuid_generate_v4(),
  job_id           uuid not null references jobs(id) on delete cascade,
  name             text not null,
  worker_id        uuid references profiles(id) on delete set null,
  estimated_hours  numeric(6,2) not null,
  actual_hours     numeric(6,2),
  status           text not null default 'pending'
                   check (status in ('pending', 'in_progress', 'completed')),
  bonus_enabled    boolean not null default true,
  sort_order       integer not null default 0,
  checked_in_at    timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz default now()
);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
-- Auto-generated when a task is completed
create table payments (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid not null references tasks(id) on delete cascade,
  worker_id    uuid not null references profiles(id) on delete cascade,
  base_pay     numeric(10,2) not null,
  bonus_pay    numeric(10,2) not null default 0,
  total_pay    numeric(10,2) not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'paid')),
  created_at   timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table profiles  enable row level security;
alter table companies enable row level security;
alter table jobs      enable row level security;
alter table tasks     enable row level security;
alter table payments  enable row level security;

-- Profiles: users can read/update their own profile
create policy "profiles_select" on profiles for select using (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Companies: members can read their company
create policy "companies_select" on companies for select
  using (id in (select company_id from profiles where id = auth.uid()));

-- Foremen can insert companies
create policy "companies_insert" on companies for insert
  with check (owner_id = auth.uid());

-- Foremen can update their own company
create policy "companies_update" on companies for update
  using (owner_id = auth.uid());

-- Jobs: members of the same company can see all jobs
create policy "jobs_select" on jobs for select
  using (company_id in (select company_id from profiles where id = auth.uid()));

create policy "jobs_insert" on jobs for insert
  with check (
    company_id in (
      select company_id from profiles
      where id = auth.uid() and role = 'foreman'
    )
  );

create policy "jobs_update" on jobs for update
  using (
    company_id in (
      select company_id from profiles
      where id = auth.uid() and role = 'foreman'
    )
  );

-- Tasks: same-company members can see; workers can update their own tasks
create policy "tasks_select" on tasks for select
  using (
    job_id in (
      select j.id from jobs j
      join profiles p on p.company_id = j.company_id
      where p.id = auth.uid()
    )
  );

create policy "tasks_insert" on tasks for insert
  with check (
    job_id in (
      select j.id from jobs j
      join profiles p on p.company_id = j.company_id
      where p.id = auth.uid() and p.role = 'foreman'
    )
  );

create policy "tasks_update" on tasks for update
  using (
    -- Foremen can update any task in their company
    job_id in (
      select j.id from jobs j
      join profiles p on p.company_id = j.company_id
      where p.id = auth.uid() and p.role = 'foreman'
    )
    or
    -- Workers can check in/complete their own tasks
    worker_id = auth.uid()
  );

-- Payments: workers see their own; foremen see all in company
create policy "payments_select" on payments for select
  using (
    worker_id = auth.uid()
    or exists (
      select 1 from profiles where id = auth.uid() and role = 'foreman'
      and company_id in (
        select p2.company_id from profiles p2 where p2.id = payments.worker_id
      )
    )
  );

create policy "payments_insert" on payments for insert with check (true);

-- ─── FUNCTIONS ────────────────────────────────────────────────────────────────

-- Calculate and insert a payment record when a task is completed
create or replace function complete_task(
  p_task_id uuid,
  p_actual_hours numeric
)
returns void language plpgsql security definer as $$
declare
  v_task    tasks%rowtype;
  v_worker  profiles%rowtype;
  v_base    numeric;
  v_bonus   numeric := 0;
begin
  select * into v_task from tasks where id = p_task_id;
  select * into v_worker from profiles where id = v_task.worker_id;

  -- Base pay = estimated hours × rate (not actual — this is intentional)
  v_base := v_task.estimated_hours * v_worker.rate_per_hour;

  -- Bonus = 10% of base if on time and bonus enabled
  if v_task.bonus_enabled and p_actual_hours <= v_task.estimated_hours then
    v_bonus := v_base * 0.10;
  end if;

  -- Update task
  update tasks set
    status       = 'completed',
    actual_hours = p_actual_hours,
    completed_at = now()
  where id = p_task_id;

  -- Insert payment record
  insert into payments (task_id, worker_id, base_pay, bonus_pay, total_pay)
  values (p_task_id, v_task.worker_id, v_base, v_bonus, v_base + v_bonus);
end;
$$;

-- ─── SEED DATA (optional — comment out for production) ────────────────────────
-- Use this to test locally. Replace UUIDs with real ones after signing up.
--
-- insert into companies (id, name) values ('11111111-0000-0000-0000-000000000001', 'Demo Construction Co.');
