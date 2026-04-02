'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState<'foreman' | 'worker'>('foreman')
  const [trade, setTrade]       = useState('')
  const [rate, setRate]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      // Fetch profile to determine where to send the user
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', data.user.id)
        .single()

      if (!profile) { router.push('/'); return }

      if (profile.role === 'foreman') {
        // Foreman with no company → finish onboarding
        router.push(profile.company_id ? '/foreman/dashboard' : '/onboarding')
      } else {
        // Worker with no company → join flow
        router.push(profile.company_id ? '/worker' : '/join')
      }
    } else {
      // Sign up
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      if (data.user) {
        // Create profile
        const { error: profileErr } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: name,
          role,
          trade: trade || null,
          rate_per_hour: parseFloat(rate) || 0,
        })
        if (profileErr) { setError(profileErr.message); setLoading(false); return }

        // Foreman → create company; Worker → join company
        router.push(role === 'foreman' ? '/onboarding' : '/join')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Crewmate</h1>
          <p className="text-gray-500 mt-1 text-sm">Job Execution Platform</p>
        </div>

        <div className="card p-6">
          {/* Mode toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors
                  ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="Marcus Thompson" value={name}
                    onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">I am a...</label>
                  <select className="input" value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value="foreman">Foreman / GC</option>
                    <option value="worker">Worker / Crew Member</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Trade</label>
                    <input className="input" placeholder="e.g. Framing" value={trade}
                      onChange={e => setTrade(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Rate ($/hr)</label>
                    <input className="input" type="number" placeholder="32" value={rate}
                      onChange={e => setRate(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Crewmate keeps your crews accountable and on schedule.
        </p>
      </div>
    </div>
  )
}
