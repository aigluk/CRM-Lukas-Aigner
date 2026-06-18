'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

function BinaryRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const FONT = 13

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      ctx.fillStyle = '#1A1A1A'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const colCount = () => Math.floor(canvas.width / FONT)
    let drops: number[] = Array.from({ length: colCount() }, () =>
      Math.floor(Math.random() * -60)
    )

    let last = 0
    let raf: number

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 55) return  // ~18 fps cap
      last = now

      // Fade trail
      ctx.fillStyle = 'rgba(26,26,26,0.07)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `bold ${FONT}px monospace`

      const len = colCount()
      if (drops.length !== len) drops = Array.from({ length: len }, () => Math.floor(Math.random() * -60))

      for (let i = 0; i < len; i++) {
        if (drops[i] < 0) { drops[i]++; continue }

        const ch = Math.random() > 0.5 ? '1' : '0'
        const x  = i * FONT
        const y  = drops[i] * FONT

        ctx.fillStyle = 'rgba(255,82,82,0.88)'
        ctx.fillText(ch, x, y)

        drops[i]++
        if (y > canvas.height && Math.random() > 0.974) {
          drops[i] = Math.floor(Math.random() * -30)
        }
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-35" />
}

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
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 relative overflow-hidden">
      <BinaryRain />

      <div className="w-full max-w-xs relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo className="h-16 w-auto text-accent" />
        </div>

        {/* Form card */}
        <div className="bg-panel/90 backdrop-blur-md rounded-2xl p-7 space-y-4 border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
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
