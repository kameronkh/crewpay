'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Task, Profile } from '@/lib/types'

export default function WorkerPage() {
  const supabase = createClient()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [actualHours, setActualHours] = useState<Record<string, string>>({})

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)

    const { data: taskData } = await supabase
      .from('tasks')
      .select(`*, job:jobs(name), payment:payments(*)`)
      .eq('worker_id', user.id)
      .neq('status', 'completed')
      .order('created_at', { ascending: true })

    setTasks((taskData as any[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCheckIn(taskId: string) {
    await supabase.from('tasks').update({
      status: 'in_progress',
      checked_in_at: new Date().toISOString(),
    }).eq('id', taskId)
    load()
  }

  async function handleComplete(taskId: string) {
    const hrs = parseFloat(actualHours[taskId] || '0')
    if (!hrs) return
    await supabase.rpc('complete_task', { p_task_id: taskId, p_actual_hours: hrs })
    setCompleting(null)
    load()
  }

  const supabaseSignOut = createClient()

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
  )

  // Pay summary
  const completedTasks: Task[] = []
  const activeTasks = tasks.filter(t => t.status !== 'completed')
  const pendingEarnings = activeTasks.reduce((s, t) => {
    if (!profile) return s
    const base = t.estimated_hours * profile.rate_per_hour
    const bonus = t.bonus_enabled ? base * 0.1 : 0
    return s + base + bonus
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-blue-700">CrewPay</span>
            <span className="text-gray-400 text-xs ml-2">Worker</span>
          </div>
          <button
            onClick={async () => { await supabaseSignOut.auth.signOut(); window.location.href = '/' }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Hey {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} assigned
            · Up to <span className="font-medium text-green-600">${pendingEarnings.toFixed(0)}</span> available
          </p>
        </div>

        {activeTasks.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <p className="text-lg">No tasks assigned right now.</p>
            <p className="text-sm mt-1">Check back when your foreman assigns new work.</p>
          </div>
        ) : (
          activeTasks.map(task => {
            const base   = profile ? task.estimated_hours * profile.rate_per_hour : 0
            const bonus  = task.bonus_enabled ? base * 0.1 : 0
            const isCompleting = completing === task.id

            return (
              <div key={task.id} className="card p-4">
                {/* Job label */}
                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                  {(task as any).job?.name}
                </p>

                {/* Task name + status */}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-800">{task.name}</h2>
                  <span className={`badge-${task.status}`}>
                    {task.status === 'in_progress' ? 'In Progress' :
                     task.status === 'completed'   ? 'Complete'    : 'Pending'}
                  </span>
                </div>

                {/* Pay info */}
                <div className="mt-3 bg-blue-50 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Base pay</p>
                    <p className="font-semibold text-gray-800">${base.toFixed(0)}</p>
                    <p className="text-xs text-gray-400">{task.estimated_hours}h est. × ${profile?.rate_per_hour}/hr</p>
                  </div>
                  {task.bonus_enabled && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">On-time bonus</p>
                      <p className="font-semibold text-green-600">+${bonus.toFixed(0)}</p>
                      <p className="text-xs text-gray-400">Finish by {task.estimated_hours}h</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total possible</p>
                    <p className="text-lg font-bold text-blue-700">${(base + bonus).toFixed(0)}</p>
                  </div>
                </div>

                {/* Check in time */}
                {task.checked_in_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Checked in: {new Date(task.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {/* Actions */}
                {task.status === 'pending' && (
                  <button onClick={() => handleCheckIn(task.id)}
                    className="btn-primary w-full mt-3">
                    Check In to Start
                  </button>
                )}

                {task.status === 'in_progress' && !isCompleting && (
                  <button onClick={() => setCompleting(task.id)}
                    className="btn-primary w-full mt-3 bg-green-600 hover:bg-green-700">
                    Mark Complete
                  </button>
                )}

                {task.status === 'in_progress' && isCompleting && (
                  <div className="mt-3 space-y-2">
                    <label className="label">How many hours did this actually take?</label>
                    <input className="input" type="number" min="0.5" step="0.5"
                      placeholder={task.estimated_hours.toString()}
                      value={actualHours[task.id] ?? ''}
                      onChange={e => setActualHours(h => ({ ...h, [task.id]: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={() => setCompleting(null)} className="btn-secondary flex-1">
                        Cancel
                      </button>
                      <button onClick={() => handleComplete(task.id)}
                        className="btn-primary flex-1 bg-green-600 hover:bg-green-700">
                        Confirm Complete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
