'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Download, RefreshCw, ArrowUpRight } from 'lucide-react'

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

function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

// Derive a clean 2-letter badge from the section title
function sectionBadge(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('finanz') || t.includes('markt') || t.includes('börse')) return 'FM'
  if (t.includes('immobil')) return 'IM'
  if (t.includes('wirtschaft') || t.includes('makro') || t.includes('global')) return 'WW'
  if (t.includes('unternehmen') || t.includes('aktien') || t.includes('earnings')) return 'UA'
  return title.slice(0, 2).toUpperCase()
}

function SectionCard({ section, index }: { section: BriefingSection; index: number }) {
  const badge = sectionBadge(section.title)
  const colors = ['bg-accent', 'bg-white/15', 'bg-white/10', 'bg-accent/60']
  const badgeBg = colors[index % colors.length]

  return (
    <div className="border-b border-white/6 pb-6 last:border-0 last:pb-0">
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-xl ${badgeBg} flex items-center justify-center shrink-0 mt-0.5`}>
          <span className="text-xs font-black text-white tracking-tight">{badge}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-white uppercase tracking-wide mb-2">{section.title}</h3>
          <p className="text-sm text-white/65 leading-relaxed mb-4">{section.summary}</p>
          <div className="flex gap-3 items-stretch">
            <div className="w-0.5 bg-accent rounded-full shrink-0" />
            <div>
              <p className="text-xs font-bold text-accent mb-1 uppercase tracking-widest">Key Takeaway</p>
              <p className="text-sm text-white/80 leading-relaxed">{section.callout}</p>
            </div>
          </div>
          {section.source && (
            <p className="text-xs text-white/20 mt-3 flex items-center gap-1">
              <ArrowUpRight size={10} />
              {section.source}
            </p>
          )}
        </div>
      </div>
    </div>
  )
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
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-white">BR</span>
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-black text-white tracking-tight">Tages-Briefing</p>
            <p className="text-xs text-white/35 mt-0.5 font-medium">{fmtDateShort(briefing.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {briefing.pdf_url && (
            <a
              href={briefing.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="w-7 h-7 rounded-lg bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all"
            >
              <Download size={12} />
            </a>
          )}
          <div className="w-6 h-6 rounded-lg bg-white/6 flex items-center justify-center">
            {open
              ? <ChevronUp size={13} className="text-white/40" />
              : <ChevronDown size={13} className="text-white/40" />
            }
          </div>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-6">
          <div className="space-y-6 mb-6">
            {briefing.sections.map((s, i) => (
              <SectionCard key={i} section={s} index={i} />
            ))}
          </div>

          {briefing.glossary && briefing.glossary.length > 0 && (
            <div className="border-t border-white/6 pt-5">
              <p className="text-xs font-black text-white/30 mb-3 uppercase tracking-widest">Glossar</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {briefing.glossary.map((g, i) => (
                  <div key={i} className="bg-panel-2 rounded-xl px-4 py-3">
                    <p className="text-xs font-black text-white mb-1 uppercase tracking-wide">{g.term}</p>
                    <p className="text-xs text-white/45 leading-relaxed">{g.definition}</p>
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
  const [triggerError, setTriggerError] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const LOAD_STEPS = [
    { at: 0,  text: 'Claude durchsucht das Web nach aktuellen Nachrichten...' },
    { at: 12, text: 'Finanzmärkte & Immobiliendaten werden analysiert...' },
    { at: 25, text: 'Weltwirtschaft & Unternehmens-News werden eingeordnet...' },
    { at: 40, text: 'Briefing & Lernbegriffe werden zusammengestellt...' },
    { at: 55, text: 'Fast fertig — Daten werden gespeichert...' },
  ]

  function currentStep(sec: number) {
    return [...LOAD_STEPS].reverse().find(s => sec >= s.at)?.text ?? LOAD_STEPS[0].text
  }

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
    setTriggerError(false)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    const res = await fetch('/api/briefing/trigger', { method: 'POST' })
    const data = await res.json()

    if (timerRef.current) clearInterval(timerRef.current)
    setElapsed(0)

    if (data.ok) {
      setTriggerMsg(data.skipped ? data.reason : 'Briefing erfolgreich generiert.')
      setTriggerError(false)
      if (!data.skipped) await load()
    } else {
      setTriggerMsg('Fehler: ' + (data.error ?? 'Unbekannt'))
      setTriggerError(true)
    }
    setTriggering(false)
  }

  return (
    <div className="h-full flex flex-col gap-5">

      {/* Header */}
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Briefing</h1>
          <p className="text-sm text-white/40 mt-1">Tagesaktuelle Markt- und Wirtschaftseinordnung</p>
        </div>
        {briefings.length > 0 && (
          <button
            onClick={triggerNow}
            disabled={triggering}
            className="flex items-center gap-2 bg-white/6 hover:bg-white/10 disabled:opacity-40 text-white/50 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shrink-0"
          >
            <RefreshCw size={12} className={triggering ? 'animate-spin' : ''} />
            {triggering ? 'Generiere...' : 'Neu generieren'}
          </button>
        )}
      </div>

      {triggerMsg && (
        <div className={`shrink-0 px-4 py-3 rounded-xl text-xs font-bold ${triggerError ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/60'}`}>
          {triggerMsg}
        </div>
      )}

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : briefings.length === 0 ? (
          <div className="bg-panel rounded-2xl px-8 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent mx-auto mb-5 flex items-center justify-center">
              <span className="text-base font-black text-white">BR</span>
            </div>
            <p className="text-base font-black text-white mb-2">Noch kein Briefing vorhanden</p>
            <p className="text-xs text-white/35 leading-relaxed mb-6">
              Ab morgen 06:00 Uhr täglich automatisch.<br />Erstes Briefing jetzt manuell starten.
            </p>
            <button
              onClick={triggerNow}
              disabled={triggering}
              className="inline-flex items-center gap-2 bg-accent hover:opacity-90 disabled:opacity-40 text-white font-black text-sm px-6 py-3 rounded-xl transition-all"
            >
              <RefreshCw size={14} className={triggering ? 'animate-spin' : ''} />
              {triggering ? 'Wird generiert...' : 'Briefing generieren'}
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
