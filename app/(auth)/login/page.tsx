'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-Mail oder Passwort falsch.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-xs">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo className="h-16 w-auto text-accent" />
        </div>

        {/* Form card */}
        <div className="bg-panel rounded-2xl p-7 space-y-4">
          <p className="text-base font-black text-white mb-1">Anmelden</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[10px] font-black text-white/25 tracking-wide mb-1.5">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-dark rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all"
                placeholder="deine@email.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-white/25 tracking-wide mb-1.5">
                Passwort
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-dark rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-accent text-sm py-1 font-medium">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:opacity-90 text-white font-black py-3 px-6 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1 active:scale-[0.98]"
            >
              {loading ? 'Einloggen…' : 'Einloggen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
