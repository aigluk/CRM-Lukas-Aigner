'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Download, RefreshCw, AlertCircle } from 'lucide-react'

interface BriefingSection {
  icon: string
  title: string
  summary: string
  callout: string
  source: string
}

interface GlossaryItem {
  term: string
  definition: string
}

interface Briefing {
  id: string
  date: string
  sections: BriefingSection[]
  glossary: GlossaryItem[]
  pdf_url: string | null
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function BriefingCard({ briefing, defaultOpen }: { briefing: Briefing; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-panel-hover transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen size={16} className="text-accent shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-sm font-black text-white">Tages-Briefing</p>
            <p className="text-xs text-white/40 mt-0.5">{fmtDate(briefing.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {briefing.pdf_url && (
            <a
              href={briefing.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="w-7 h-7 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all"
              title="PDF herunterladen"
            >
              <Download size={13} />
            </a>
          )}
          {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {briefing.sections.map((s, i) => (
            <div key={i} className="bg-panel-2 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{s.icon}</span>
                <h3 className="text-sm font-black text-white">{s.title}</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed mb-3">{s.summary}</p>
              <div className="bg-accent/10 border border-accent/20 rounded-xl px-3.5 py-3 mb-2">
                <p className="text-xs font-bold text-accent mb-1">Warum das wichtig ist</p>
                <p className="text-xs text-white/70 leading-relaxed">{s.callout}</p>
              </div>
              {s.source && (
                <p className="text-xs text-white/25 mt-1">Quelle: {s.source}</p>
              )}
            </div>
          ))}

          {briefing.glossary && briefing.glossary.length > 0 && (
            <div>
              <p className="text-xs font-black text-white/40 mb-2 uppercase tracking-widest">Glossar</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {briefing.glossary.map((g, i) => (
                  <div key={i} className="bg-panel-2 rounded-xl px-3.5 py-3">
                    <p className="text-xs font-bold text-accent-green mb-0.5">{g.term}</p>
                    <p className="text-xs text-white/55 leading-relaxed">{g.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BriefingView() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/briefing')
    const data = await res.json()
    setBriefings(data.briefings ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function triggerNow() {
    setTriggering(true)
    setTriggerMsg('')
    const secret = process.env.NEXT_PUBLIC_CRON_TRIGGER_TOKEN
    const res = await fetch('/api/cron/daily-briefing', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret ?? ''}` },
    })
    const data = await res.json()
    if (data.ok) {
      setTriggerMsg(data.skipped ? 'Briefing wurde heute bereits generiert.' : 'Briefing generiert!')
      await load()
    } else {
      setTriggerMsg('Fehler: ' + (data.error ?? 'Unbekannt'))
    }
    setTriggering(false)
  }

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Briefing</h1>
          <p className="text-sm text-white/40 mt-1">Tagesaktuelle Einordnung zu Finanzmärkten & Immobilien</p>
        </div>
      </div>

      {triggerMsg && (
        <div className="shrink-0 flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-accent shrink-0" />
          <p className="text-sm text-white/80">{triggerMsg}</p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : briefings.length === 0 ? (
          <div className="bg-panel rounded-2xl py-16 text-center">
            <BookOpen size={32} className="text-white/15 mx-auto mb-3" />
            <p className="text-sm font-bold text-white/40 mb-1">Noch kein Briefing vorhanden</p>
            <p className="text-xs text-white/25 mb-5">Das erste Briefing wird um 06:00 Uhr automatisch generiert.</p>
            <button
              onClick={triggerNow}
              disabled={triggering}
              className="inline-flex items-center gap-2 bg-accent hover:opacity-90 disabled:opacity-40 text-white font-black text-sm px-5 py-2.5 rounded-xl transition-all"
            >
              <RefreshCw size={14} className={triggering ? 'animate-spin' : ''} />
              {triggering ? 'Wird generiert...' : 'Jetzt generieren'}
            </button>
          </div>
        ) : (
          briefings.map((b, i) => (
            <BriefingCard key={b.id} briefing={b} defaultOpen={i === 0} />
          ))
        )}
      </div>
    </div>
  )
}
