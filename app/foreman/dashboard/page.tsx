'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Job, Profile, Task, onTimeRate, jobProgress } from '@/lib/types'
import TaskRow from '@/components/TaskRow'

export default function Dashboard() {
  const supabase = createClient()
  const [jobs, setJobs]       = useState<Job[]>([])
  const [workers, setWorkers] = useState<Profile[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (!profile) return

    // Load jobs with tasks and worker info
    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`*, tasks(*, worker:profiles(*), payment:payments(*))`)
      .eq('company_id', profile.company_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Load workers in company
    const { data: workersData } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('role', 'worker')

    setJobs((jobsData as Job[]) ?? [])
    setWorkers((workersData as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Handle check-in
  async function handleCheckIn(taskId: string) {
    await supabase.from('tasks').update({
      status: 'in_progress',
      checked_in_at: new Date().toISOString(),
    }).eq('id', taskId)
    load()
  }

  // Handle complete
  async function handleComplete(taskId: string, actualHours: number) {
    await supabase.rpc('complete_task', {
      p_task_id: taskId,
      p_actual_hours: actualHours,
    })
    load()
  }

  // Stats across all jobs
  const allTasks = jobs.flatMap(j => j.tasks ?? [])
  const totalPay = allTasks.reduce((s, t) => {
    const w = workers.find(w => w.id === t.worker_id)
    if (!w) return s
    const base = t.estimated_hours * w.rate_per_hour
    const bonus = t.status === 'completed' && t.bonus_enabled &&
      t.actual_hours !== null && t.actual_hours <= t.estimated_hours
      ? base * 0.1 : 0
    return s + base + bonus
  }, 0)
  const bonusPay = allTasks.reduce((s, t) => {
    const w = workers.find(w => w.id === t.worker_id)
    if (!w) return s
    if (t.status !== 'completed' || !t.bonus_enabled) return s
    if (t.actual_hours !== null && t.actual_hours <= t.estimated_hours)
      return s + (t.estimated_hours * w.rate_per_hour * 0.1)
    return s
  }, 0)
  const onTime = onTimeRate(allTasks)

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>
  )

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="On-Time Rate" value={`${onTime}%`}
          sub={`${allTasks.filter(t => t.status === 'completed').length} tasks done`}
          color={onTime >= 85 ? 'text-green-600' : 'text-orange-500'} />
        <StatCard label="Total Payouts" value={`$${totalPay.toFixed(0)}`} sub="Active jobs" />
        <StatCard label="Bonuses Earned" value={`$${bonusPay.toFixed(0)}`}
          sub="On-time incentives" color="text-green-600" />
      </div>

      {/* Jobs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Active Jobs</h2>
        <a href="/foreman/jobs/new" className="btn-primary">+ New Job</a>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-lg mb-2">No active jobs yet.</p>
          <a href="/foreman/jobs/new" className="btn-primary inline-flex mt-2">Create your first job</a>
        </div>
      ) : (
        jobs.map(job => {
          const { done, total, pct } = jobProgress(job)
          const jobPay = (job.tasks ?? []).reduce((s, t) => {
            const w = workers.find(w => w.id === t.worker_id)
            if (!w) return s
            return s + (t.estimated_hours * w.rate_per_hour)
          }, 0)
          return (
            <div key={job.id} className="card mb-4 overflow-hidden">
              {/* Job header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === job.id ? null : job.id)}
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-800">{job.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {done}/{total} tasks · ${jobPay.toFixed(0)} total pay
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{pct}%</p>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                      <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-gray-400">{expanded === job.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Tasks */}
              {expanded === job.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                  {(job.tasks ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400">No tasks on this job.</p>
                  ) : (
                    (job.tasks ?? []).map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        worker={workers.find(w => w.id === task.worker_id)}
                        onCheckIn={() => handleCheckIn(task.id)}
                        onComplete={(hrs) => handleComplete(task.id, hrs)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
