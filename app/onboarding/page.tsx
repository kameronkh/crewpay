'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) { setError('Company name is required'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    // Create the company
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert({ name: companyName.trim(), owner_id: user.id })
      .select()
      .single()

    if (companyErr) { setError(companyErr.message); setSaving(false); return }

    // Link the foreman's profile to the new company
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ company_id: company.id })
      .eq('id', user.id)

    if (profileErr) { setError(profileErr.message); setSaving(false); return }

    router.push('/foreman/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Crewmate</h1>
          <p className="text-gray-500 mt-1 text-sm">Let's set up your company</p>
        </div>

        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Create your company</h2>
            <p className="text-sm text-gray-500 mt-1">
              Workers will join your company using an invite code you can share from your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input
                className="input"
                placeholder="e.g. Thompson Construction"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                autoFocus
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Creating…' : 'Create Company →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
