'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function JoinPage() {
  const supabase = createClient()
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = inviteCode.trim().toLowerCase()
    if (!code) { setError('Enter an invite code'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    // Look up company by invite code
    const { data: company, error: lookupErr } = await supabase
      .from('companies')
      .select('id, name')
      .eq('invite_code', code)
      .single()

    if (lookupErr || !company) {
      setError('Invite code not found. Check with your foreman.')
      setSaving(false)
      return
    }

    // Link worker profile to the company
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ company_id: company.id })
      .eq('id', user.id)

    if (profileErr) { setError(profileErr.message); setSaving(false); return }

    router.push('/worker')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Crewmate</h1>
          <p className="text-gray-500 mt-1 text-sm">Join your crew</p>
        </div>

        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Enter your invite code</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ask your foreman for the invite code from their dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Invite Code</label>
              <input
                className="input text-center tracking-widest uppercase font-mono text-lg"
                placeholder="e.g. AB12CD34"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                maxLength={8}
                autoFocus
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Joining…' : 'Join Company →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Don't have a code? Ask your foreman to share it from their dashboard.
        </p>
      </div>
    </div>
  )
}
