'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

/* ── Binary rain ─────────────────────────────────────────────── */
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
      if (now - last < 55) return
      last = now

      ctx.fillStyle = 'rgba(26,26,26,0.07)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `bold ${FONT}px monospace`

      const len = colCount()
      if (drops.length !== len) drops = Array.from({ length: len }, () => Math.floor(Math.random() * -60))

      for (let i = 0; i < len; i++) {
        if (drops[i] < 0) { drops[i]++; continue }
        const ch = Math.random() > 0.5 ? '1' : '0'
        ctx.fillStyle = 'rgba(255,82,82,0.88)'
        ctx.fillText(ch, i * FONT, drops[i] * FONT)
        drops[i]++
        if (drops[i] * FONT > canvas.height && Math.random() > 0.974) {
          drops[i] = Math.floor(Math.random() * -30)
        }
      }
    }

    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-35" />
}

/* ── Glass input ──────────────────────────────────────────────── */
function GlassInput({
  type, value, onChange, placeholder, autoComplete, required, right,
}: {
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  autoComplete?: string
  required?: boolean
  right?: React.ReactNode
}) {
  return (
    <div className="relative">
      {/* Top highlight rim */}
      <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10" />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-2xl px-5 py-4 pr-14 text-[15px] text-white placeholder-white/30 outline-none transition-all bg-white/8 border border-white/10 focus:border-white/22 focus:bg-white/12 backdrop-blur-md"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      />
      {right && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  )
}

/* ── Glass button ─────────────────────────────────────────────── */
function GlassButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="relative w-full overflow-hidden rounded-2xl py-4 text-[15px] font-black text-white transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Base accent fill */}
      <div className="absolute inset-0 bg-accent/85" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
      {/* Top shine */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/22 to-transparent" />
      {/* Top edge highlight */}
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      {/* Border */}
      <div className="absolute inset-0 rounded-2xl border border-white/15 border-t-white/30" />
      {/* Label */}
      <span className="relative z-10 drop-shadow-sm">
        {loading ? 'Einloggen…' : 'Einloggen'}
      </span>
    </button>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
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

        {/* Glass card — no shadow */}
        <div
          className="rounded-3xl p-7 space-y-5 border border-white/10 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
        >
          {/* Card top highlight */}
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

          <p className="text-base font-black text-white">Anmelden</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[10px] font-black text-white/30 tracking-wide mb-2">
                E-Mail
              </label>
              <GlassInput
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-white/30 tracking-wide mb-2">
                Passwort
              </label>
              <GlassInput
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                right={
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                    className="p-1 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-accent text-sm py-1 font-medium">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-1">
              <GlassButton loading={loading} />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
