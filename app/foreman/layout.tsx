'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { label: 'Dashboard', href: '/foreman/dashboard' },
  { label: 'New Job',   href: '/foreman/jobs/new' },
]

export default function ForemanLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-blue-700 text-lg">CrewPay</span>
            <span className="text-gray-400 text-xs ml-2">Foreman</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(n => (
              <a key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${pathname === n.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'}`}>
                {n.label}
              </a>
            ))}
          </nav>
          <button onClick={signOut} className="btn-ghost text-xs">Sign out</button>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex border-t border-gray-100">
          {NAV.map(n => (
            <a key={n.href} href={n.href}
              className={`flex-1 py-2 text-center text-xs font-medium transition-colors
                ${pathname === n.href ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500'}`}>
              {n.label}
            </a>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
