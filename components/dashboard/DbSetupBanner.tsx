'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Copy, Check, ExternalLink, X } from 'lucide-react'

export function DbSetupBanner() {
  const [state, setState] = useState<'loading' | 'ok' | 'required' | 'dismissed'>('loading')
  const [sql, setSql] = useState('')
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // check once per session
    if (sessionStorage.getItem('db_setup_checked')) { setState('ok'); return }
    fetch('/api/setup')
      .then(r => r.json())
      .then(d => {
        if (d.setup_required) {
          setSql(d.sql ?? '')
          setUrl(d.dashboard_url ?? 'https://supabase.com/dashboard')
          setState('required')
        } else {
          sessionStorage.setItem('db_setup_checked', '1')
          setState('ok')
        }
      })
      .catch(() => setState('ok'))
  }, [])

  function copySQL() {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state !== 'required') return null

  return (
    <div className="bg-[#2a1a0e] border border-accent/30 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white mb-1">Datenbank einrichten (einmalig)</p>
          <p className="text-xs text-white/50 mb-4">
            Die Datenbanktabellen wurden noch nicht erstellt. Führe den SQL-Code einmalig in deinem
            Supabase Dashboard aus — das dauert 10 Sekunden.
          </p>

          <div className="space-y-2 mb-4">
            <Step n={1} text='Supabase Dashboard öffnen (Button rechts)' />
            <Step n={2} text='Links im Menü → "SQL Editor" klicken' />
            <Step n={3} text='Den SQL-Code unten einfügen und auf "Run" drücken' />
            <Step n={4} text='Zurück hier klicken und Seite neu laden' />
          </div>

          <div className="bg-dark rounded-xl p-3 mb-4 relative">
            <pre className="text-[10px] text-white/50 font-mono overflow-x-auto max-h-24 whitespace-pre-wrap break-all">
              {sql}
            </pre>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copySQL}
              className="flex items-center gap-2 bg-accent/20 hover:bg-accent/30 text-accent font-bold text-xs px-4 py-2 rounded-xl transition-all"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Kopiert!' : 'SQL kopieren'}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-accent hover:opacity-90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
            >
              <ExternalLink size={13} />
              Supabase Dashboard öffnen
            </a>
            <button
              onClick={() => window.location.reload()}
              className="text-white/40 hover:text-white text-xs font-bold px-3 py-2 transition-all"
            >
              Neu laden
            </button>
            <button
              onClick={() => setState('dismissed')}
              className="ml-auto text-white/20 hover:text-white/50 transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-xs text-white/60">{text}</span>
    </div>
  )
}
