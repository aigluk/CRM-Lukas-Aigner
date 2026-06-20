'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'

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

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
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

  const inputCls = 'w-full bg-transparent border-0 border-b-2 border-white/15 rounded-none px-1 py-3 text-[15px] text-white placeholder-white/25 outline-none focus:border-accent transition-colors'

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 relative overflow-hidden">
      <BinaryRain />

      <div className="w-full max-w-88 sm:max-w-sm relative z-10">
        <div className="flex justify-center mb-10">
          <Logo className="h-14 sm:h-16 w-auto text-accent" />
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-white/35 mb-2">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="deine@email.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/35 mb-2">Passwort</label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-accent text-sm font-medium py-0.5">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3.5 rounded-2xl text-[15px] transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Wird angemeldet…' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
