'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface TaskDraft {
  name: string
  worker_id: string
  estimated_hours: string
  bonus_enabled: boolean
}

export default function NewJobPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [jobName, setJobName]   = useState('')
  const [workers, setWorkers]   = useState<Profile[]>([])
  const [tasks, setTasks]       = useState<TaskDraft[]>([
    { name: '', worker_id: '', estimated_hours: '', bonus_enabled: true }
  ])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    async function loadWorkers() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) return
      const { data } = await supabase
        .from('profiles').select('*').eq('company_id', profile.company_id).eq('role', 'worker')
      setWorkers((data as Profile[]) ?? [])
    }
    loadWorkers()
  }, [])

  function addTask() {
    setTasks(t => [...t, { name: '', worker_id: '', estimated_hours: '', bonus_enabled: true }])
  }

  function removeTask(i: number) {
    setTasks(t => t.filter((_, idx) => idx !== i))
  }

  function updateTask(i: number, field: keyof TaskDraft, value: string | boolean) {
    setTasks(t => t.map((task, idx) => idx === i ? { ...task, [field]: value } : task))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!jobName.trim()) { setError('Job name is required'); return }
    const validTasks = tasks.filter(t => t.name && t.worker_id && t.estimated_hours)
    if (!validTasks.length) { setError('Add at least one complete task'); return }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles').select('company_id').eq('id', user.id).single()

    // Create job
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({ name: jobName, company_id: profile?.company_id, created_by: user.id })
      .select().single()
    if (jobErr) { setError(jobErr.message); setSaving(false); return }

    // Create tasks
    const taskRows = validTasks.map((t, i) => ({
      job_id: job.id,
      name: t.name,
      worker_id: t.worker_id,
      estimated_hours: parseFloat(t.estimated_hours),
      bonus_enabled: t.bonus_enabled,
      sort_order: i,
    }))
    const { error: taskErr } = await supabase.from('tasks').insert(taskRows)
    if (taskErr) { setError(taskErr.message); setSaving(false); return }

    router.push('/foreman/dashboard')
  }

  // Estimated pay preview
  function previewPay(task: TaskDraft): string {
    const w = workers.find(w => w.id === task.worker_id)
    if (!w || !task.estimated_hours) return '—'
    const base = parseFloat(task.estimated_hours) * w.rate_per_hour
    const bonus = task.bonus_enabled ? base * 0.1 : 0
    return `$${base.toFixed(0)} + $${bonus.toFixed(0)} bonus`
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
        <p className="text-gray-500 text-sm mt-1">Add tasks, assign workers, and set estimated hours.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Job name */}
        <div className="card p-4">
          <label className="label">Job Name</label>
          <input className="input" placeholder="e.g. Lot 14 – Kitchen Remodel"
            value={jobName} onChange={e => setJobName(e.target.value)} required />
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Tasks</h2>
            <button type="button" onClick={addTask} className="btn-secondary text-xs">
              + Add Task
            </button>
          </div>

          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-3">
                    {/* Task name */}
                    <div>
                      <label className="label">Task Name</label>
                      <input className="input" placeholder="e.g. Demo existing walls"
                        value={task.name} onChange={e => updateTask(i, 'name', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Worker */}
                      <div>
                        <label className="label">Assign Worker</label>
                        <select className="input" value={task.worker_id}
                          onChange={e => updateTask(i, 'worker_id', e.target.value)}>
                          <option value="">Select worker</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.full_name} (${w.rate_per_hour}/hr)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Estimated hours */}
                      <div>
                        <label className="label">Estimated Hours</label>
                        <input className="input" type="number" min="0.5" step="0.5" placeholder="4"
                          value={task.estimated_hours}
                          onChange={e => updateTask(i, 'estimated_hours', e.target.value)} />
                      </div>
                    </div>

                    {/* Bonus toggle + pay preview */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={task.bonus_enabled}
                          onChange={e => updateTask(i, 'bonus_enabled', e.target.checked)}
                          className="rounded text-blue-600" />
                        On-time bonus (10%)
                      </label>
                      <span className="text-sm text-gray-500">
                        Pay: <span className="font-medium text-gray-700">{previewPay(task)}</span>
                      </span>
                    </div>
                  </div>

                  {tasks.length > 1 && (
                    <button type="button" onClick={() => removeTask(i)}
                      className="text-gray-300 hover:text-red-400 transition-colors mt-1">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <a href="/foreman/dashboard" className="btn-secondary">Cancel</a>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  )
}
