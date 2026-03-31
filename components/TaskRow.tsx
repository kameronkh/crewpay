'use client'
import { useState } from 'react'
import { Task, Profile } from '@/lib/types'

interface Props {
  task: Task
  worker?: Profile
  onCheckIn: () => void
  onComplete: (actualHours: number) => void
}

export default function TaskRow({ task, worker, onCheckIn, onComplete }: Props) {
  const [showComplete, setShowComplete] = useState(false)
  const [hours, setHours] = useState('')

  const base  = worker ? task.estimated_hours * worker.rate_per_hour : 0
  const bonus = task.status === 'completed' && task.bonus_enabled &&
    task.actual_hours !== null && task.actual_hours <= task.estimated_hours
    ? base * 0.1 : (task.bonus_enabled ? base * 0.1 : 0)

  const timing = task.status === 'completed' && task.actual_hours !== null
    ? task.actual_hours <= task.estimated_hours
      ? { label: `${(task.estimated_hours - task.actual_hours).toFixed(1)}h under`, color: 'text-green-600' }
      : { label: `${(task.actual_hours - task.estimated_hours).toFixed(1)}h over`, color: 'text-red-500' }
    : null

  const statusLabel: Record<string, string> = {
    pending:     'Pending',
    in_progress: 'In Progress',
    completed:   'Complete',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800 text-sm">{task.name}</span>
            <span className={`badge-${task.status}`}>{statusLabel[task.status]}</span>
            {timing && <span className={`text-xs font-medium ${timing.color}`}>{timing.label}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {worker ? `${worker.full_name} · ${worker.trade ?? 'No trade'} · $${worker.rate_per_hour}/hr` : 'Unassigned'}
          </p>
          <p className="text-xs text-gray-400">
            Est. {task.estimated_hours}h
            {task.actual_hours != null ? ` · Actual ${task.actual_hours}h` : ''}
            {task.checked_in_at ? ` · In: ${new Date(task.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-gray-700">
            ${(base + (task.status === 'completed' ? (task.actual_hours !== null && task.actual_hours <= task.estimated_hours && task.bonus_enabled ? base * 0.1 : 0) : 0)).toFixed(0)}
          </p>
          <p className="text-xs text-gray-400">
            Base ${base.toFixed(0)}
            {task.bonus_enabled && task.status !== 'completed' && (
              <span className="text-green-600"> +${(base * 0.1).toFixed(0)} possible</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      {task.status === 'pending' && (
        <button onClick={onCheckIn} className="btn-primary mt-3 text-xs py-1.5">
          Check In
        </button>
      )}

      {task.status === 'in_progress' && !showComplete && (
        <button onClick={() => setShowComplete(true)}
          className="mt-3 text-xs py-1.5 btn-primary bg-green-600 hover:bg-green-700">
          Mark Complete
        </button>
      )}

      {task.status === 'in_progress' && showComplete && (
        <div className="mt-3 space-y-2">
          <label className="label text-xs">Actual hours taken:</label>
          <input className="input text-sm" type="number" min="0.5" step="0.5"
            placeholder={task.estimated_hours.toString()}
            value={hours} onChange={e => setHours(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => setShowComplete(false)} className="btn-secondary text-xs flex-1">
              Cancel
            </button>
            <button
              onClick={() => { onComplete(parseFloat(hours) || task.estimated_hours); setShowComplete(false) }}
              className="text-xs flex-1 btn-primary bg-green-600 hover:bg-green-700">
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
