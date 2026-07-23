'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

type LearningPath = 'finance_fundamentals' | 'immobilienfinanzierung' | 'makrooekonomie'
type TermStatus = 'new' | 'learning' | 'mastered'

interface Term {
  id: string
  date: string
  learning_path: LearningPath
  term: string
  definition: string
  example: string
  progress: {
    status: TermStatus
    last_reviewed: string | null
    review_count: number
  }
}

const PATHS: { id: LearningPath; label: string; abbr: string }[] = [
  { id: 'finance_fundamentals',   label: 'Finance Fundamentals',    abbr: 'FF' },
  { id: 'immobilienfinanzierung', label: 'Immobilienfinanzierung',  abbr: 'IF' },
  { id: 'makrooekonomie',         label: 'Makroökonomie',           abbr: 'MÖ' },
]

const STATUS_LABELS: Record<TermStatus, string> = {
  new:      'Neu',
  learning: 'In Bearbeitung',
  mastered: 'Gelernt',
}

const STATUS_NEXT: Record<TermStatus, TermStatus> = {
  new:      'learning',
  learning: 'mastered',
  mastered: 'mastered',
}

function TermCard({ term, onProgress }: { term: Term; onProgress: (id: string, status: TermStatus) => void }) {
  const [showExample, setShowExample] = useState(false)
  const status = term.progress.status
  const nextStatus = STATUS_NEXT[status]

  return (
    <div className={`bg-panel rounded-2xl overflow-hidden transition-all ${status === 'mastered' ? 'opacity-50' : ''}`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <h3 className="text-base font-black text-white leading-tight tracking-tight uppercase">{term.term}</h3>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 uppercase tracking-widest ${
          status === 'mastered' ? 'bg-white/8 text-white/30' :
          status === 'learning' ? 'bg-accent/15 text-accent' :
          'bg-white/6 text-white/30'
        }`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Definition */}
      <div className="px-5 pb-4">
        <p className="text-sm text-white/70 leading-relaxed">{term.definition}</p>
      </div>

      {/* Example — expandable */}
      {showExample && (
        <div className="mx-5 mb-4 flex gap-3 items-stretch">
          <div className="w-0.5 bg-white/15 rounded-full shrink-0" />
          <div>
            <p className="text-xs font-black text-white/35 uppercase tracking-widest mb-1">Praxisbeispiel</p>
            <p className="text-xs text-white/60 leading-relaxed">{term.example}</p>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 px-5 pb-4 border-t border-white/4 pt-3">
        <button
          onClick={() => setShowExample(s => !s)}
          className="text-xs font-bold text-white/30 hover:text-white/60 transition-colors"
        >
          {showExample ? 'Beispiel ausblenden' : 'Praxisbeispiel'}
        </button>
        {status !== 'mastered' && (
          <button
            onClick={() => onProgress(term.id, nextStatus)}
            className={`flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition-all ${
              status === 'learning'
                ? 'bg-accent text-white hover:opacity-90'
                : 'bg-white/8 text-white/50 hover:bg-white/12 hover:text-white'
            }`}
          >
            {status === 'learning' && <Check size={11} strokeWidth={3} />}
            {status === 'learning' ? 'Gelernt' : 'Ich lerne das'}
          </button>
        )}
      </div>
    </div>
  )
}

export function AcademyView() {
  const [activePath, setActivePath] = useState<LearningPath>('finance_fundamentals')
  const [terms, setTerms] = useState<Term[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [mastered, setMastered] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  async function load(path: LearningPath) {
    setLoading(true)
    const res = await fetch(`/api/academy?path=${path}`)
    const data = await res.json()
    setTerms(data.terms ?? [])
    setTotals(data.totalByPath ?? {})
    setMastered(data.masteredByPath ?? {})
    setLoading(false)
  }

  useEffect(() => { load(activePath) }, [activePath])

  async function handleProgress(termId: string, status: TermStatus) {
    setTerms(prev => prev.map(t =>
      t.id === termId ? { ...t, progress: { ...t.progress, status } } : t
    ))
    if (status === 'mastered') {
      setMastered(prev => ({ ...prev, [activePath]: (prev[activePath] ?? 0) + 1 }))
    }
    await fetch('/api/academy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term_id: termId, status }),
    })
  }

  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0)
  const masteredAll = Object.values(mastered).reduce((a, b) => a + b, 0)
  const activeMastered = mastered[activePath] ?? 0
  const activeTotal = totals[activePath] ?? 0
  const pct = activeTotal > 0 ? Math.round((activeMastered / activeTotal) * 100) : 0

  const activeTerms  = terms.filter(t => t.progress.status !== 'mastered')
  const doneTerms    = terms.filter(t => t.progress.status === 'mastered')

  return (
    <div className="h-full flex flex-col gap-5">

      {/* Header */}
      <div className="shrink-0">
        <p className="text-xs font-bold text-accent uppercase tracking-widest mb-1">Lernplattform</p>
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Academy</h1>
        <p className="text-sm text-white/35 mt-1.5 font-medium">
          {masteredAll} von {totalAll} {totalAll === 1 ? 'Begriff' : 'Begriffen'} gelernt
        </p>
      </div>

      {/* Path selector */}
      <div className="shrink-0 flex gap-2 overflow-x-auto scrollbar-none">
        {PATHS.map(({ id, label, abbr }) => {
          const active = id === activePath
          const m = mastered[id] ?? 0
          const t = totals[id] ?? 0
          return (
            <button
              key={id}
              onClick={() => setActivePath(id)}
              className={`flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                active ? 'bg-accent text-white' : 'bg-panel text-white/45 hover:text-white hover:bg-panel-hover'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                active ? 'bg-white/20' : 'bg-white/8'
              }`}>
                <span className="text-[10px] font-black tracking-tight">{abbr}</span>
              </div>
              <span>{label}</span>
              {t > 0 && (
                <span className={`text-xs font-black ${active ? 'text-white/60' : 'text-white/20'}`}>
                  {m}/{t}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Progress block */}
      {activeTotal > 0 && (
        <div className="shrink-0 bg-panel rounded-2xl px-5 py-4 flex items-center gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-white/40 uppercase tracking-widest">
                {PATHS.find(p => p.id === activePath)?.label}
              </p>
              <p className="text-xs font-black text-white/40">{pct}%</p>
            </div>
            <div className="h-2 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-white leading-none">{activeMastered}</p>
            <p className="text-xs text-white/30 font-medium mt-0.5">von {activeTotal}</p>
          </div>
        </div>
      )}

      {/* Terms */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : terms.length === 0 ? (
          <div className="bg-panel rounded-2xl px-8 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/6 mx-auto mb-5 flex items-center justify-center">
              <span className="text-sm font-black text-white/30">
                {PATHS.find(p => p.id === activePath)?.abbr}
              </span>
            </div>
            <p className="text-base font-black text-white mb-2">Noch keine Begriffe</p>
            <p className="text-xs text-white/30 leading-relaxed">
              Neue Begriffe werden täglich um 06:00 Uhr generiert.<br />
              Starte zuerst ein Briefing um Begriffe zu laden.
            </p>
          </div>
        ) : (
          <>
            {activeTerms.length > 0 && (
              <>
                <p className="text-xs font-black text-white/25 uppercase tracking-widest px-1">Zu lernen</p>
                {activeTerms.map(t => (
                  <TermCard key={t.id} term={t} onProgress={handleProgress} />
                ))}
              </>
            )}
            {doneTerms.length > 0 && (
              <>
                <p className="text-xs font-black text-white/25 uppercase tracking-widest px-1 pt-2">Abgeschlossen</p>
                {doneTerms.map(t => (
                  <TermCard key={t.id} term={t} onProgress={handleProgress} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
