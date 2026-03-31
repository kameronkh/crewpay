export type Role = 'foreman' | 'worker'
export type JobStatus = 'active' | 'completed' | 'archived'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type PaymentStatus = 'pending' | 'approved' | 'paid'

export interface Profile {
  id: string
  full_name: string
  role: Role
  trade: string | null
  rate_per_hour: number
  company_id: string | null
  created_at: string
}

export interface Company {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface Job {
  id: string
  company_id: string
  name: string
  status: JobStatus
  created_by: string
  created_at: string
  completed_at: string | null
  tasks?: Task[]
}

export interface Task {
  id: string
  job_id: string
  name: string
  worker_id: string | null
  estimated_hours: number
  actual_hours: number | null
  status: TaskStatus
  bonus_enabled: boolean
  sort_order: number
  checked_in_at: string | null
  completed_at: string | null
  created_at: string
  worker?: Profile
  payment?: Payment
}

export interface Payment {
  id: string
  task_id: string
  worker_id: string
  base_pay: number
  bonus_pay: number
  total_pay: number
  status: PaymentStatus
  created_at: string
}

// ─── Computed helpers ─────────────────────────────────────────────────────────

export function calcBasePay(task: Task, worker: Profile): number {
  return task.estimated_hours * worker.rate_per_hour
}

export function calcBonus(task: Task, worker: Profile): number {
  if (!task.bonus_enabled || task.status !== 'completed') return 0
  if (task.actual_hours !== null && task.actual_hours <= task.estimated_hours) {
    return calcBasePay(task, worker) * 0.1
  }
  return 0
}

export function calcTotal(task: Task, worker: Profile): number {
  return calcBasePay(task, worker) + calcBonus(task, worker)
}

export function jobProgress(job: Job): { done: number; total: number; pct: number } {
  const tasks = job.tasks ?? []
  const done = tasks.filter(t => t.status === 'completed').length
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
}

export function onTimeRate(tasks: Task[]): number {
  const done = tasks.filter(t => t.status === 'completed')
  if (!done.length) return 0
  const onTime = done.filter(t => t.actual_hours !== null && t.actual_hours <= t.estimated_hours)
  return Math.round((onTime.length / done.length) * 100)
}
