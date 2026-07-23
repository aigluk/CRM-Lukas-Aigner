'use client'

import { useEffect, useState } from 'react'
import { Check, TrendingUp, Building2 } from 'lucide-react'

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

const PATH_EMOJIS: Record<LearningPath, string> = {
  finance_fundamentals:   '📈',
  immobilienfinanzierung: '🏗️',
  makrooekonomie:         '🌍',
}

const PATHS: { id: LearningPath; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'finance_fundamentals',   label: 'Finance Fundamentals',    icon: TrendingUp },
  { id: 'immobilienfinanzierung', label: 'Immobilienfinanzierung', icon: Building2 },
  { id: 'makrooekonomie',         label: 'Makroökonomie',          icon: TrendingUp },
]

const STATUS_LABELS: Record<TermStatus, string> = {
  new:      'Neu',
  learning: 'Am Lernen',
  mastered: 'Gelernt',
}

const STATUS_NEXT: Record<TermStatus, TermStatus> = {
  new:      'learning',
  learning: 'mastered',
  mastered: 'mastered',
}

function ProgressBar({ mastered, total }: { mastered: number; total: number }) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full bg-accent-green rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/30 shrink-0">{mastered}/{total}</span>
    </div>
  )
}

function TermCard({ term, onProgress }: { term: Term; onProgress: (id: string, status: TermStatus) => void }) {
  const [flipped, setFlipped] = useState(false)
  const status = term.progress.status
  const nextStatus = STATUS_NEXT[status]

  return (
    <div className="bg-panel-2 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-black text-white leading-tight">{term.term}</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
          status === 'mastered' ? 'bg-accent-green/15 text-accent-green' :
          status === 'learning' ? 'bg-accent/15 text-accent' :
          'bg-white/8 text-white/40'
        }`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <p className="text-sm text-white/65 leading-relaxed mb-3">{term.definition}</p>

      {flipped && (
        <div className="bg-panel rounded-xl px-3.5 py-3 mb-3">
          <p className="text-xs font-bold text-accent mb-1">Praxisbeispiel</p>
          <p className="text-xs text-white/60 leading-relaxed">{term.example}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFlipped(f => !f)}
          className="flex-1 text-xs font-bold text-white/40 hover:text-white/70 transition-colors text-left"
        >
          {flipped ? 'Beispiel ausblenden' : 'Praxisbeispiel anzeigen'}
        </button>
        {status !== 'mastered' && (
          <button
            onClick={() => onProgress(term.id, nextStatus)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              status === 'learning'
                ? 'bg-accent-green/15 hover:bg-accent-green/25 text-accent-green'
                : 'bg-white/8 hover:bg-white/12 text-white/50'
            }`}
          >
            <Check size={12} />
            {status === 'learning' ? 'Gelernt' : 'Ich lerne es'}
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

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="shrink-0">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Academy</h1>
        <p className="text-sm text-white/40 mt-1">{masteredAll} von {totalAll} Begriffen gelernt</p>
      </div>

      {/* Path tabs */}
      <div className="shrink-0 flex gap-2 overflow-x-auto scrollbar-none">
        {PATHS.map(({ id, label }) => {
          const active = id === activePath
          return (
            <button
              key={id}
              onClick={() => setActivePath(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                active ? 'bg-accent text-white' : 'bg-panel text-white/50 hover:text-white hover:bg-panel-hover'
              }`}
            >
              <span className="text-sm leading-none">{PATH_EMOJIS[id]}</span>
              {label}
            </button>
          )
        })}
      </div>

      {/* Progress bar for active path */}
      <div className="shrink-0 bg-panel rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-white/50">
            {PATHS.find(p => p.id === activePath)?.label}
          </p>
          <p className="text-xs text-white/30">
            {mastered[activePath] ?? 0} von {totals[activePath] ?? 0} gelernt
          </p>
        </div>
        <ProgressBar
          mastered={mastered[activePath] ?? 0}
          total={totals[activePath] ?? 0}
        />
      </div>

      {/* Terms list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : terms.length === 0 ? (
          <div className="bg-panel rounded-2xl py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">{PATH_EMOJIS[activePath]}</span>
            </div>
            <p className="text-sm font-bold text-white mb-1">Noch keine Begriffe</p>
            <p className="text-xs text-white/35">Neue Begriffe werden täglich um 06:00 Uhr generiert.<br />Starte zuerst ein Briefing um Begriffe zu laden.</p>
          </div>
        ) : (
          <>
            {/* Today / new terms first */}
            {terms.filter(t => t.progress.status !== 'mastered').length > 0 && (
              <>
                <p className="text-xs font-black text-white/30 uppercase tracking-widest px-1">Zu lernen</p>
                {terms
                  .filter(t => t.progress.status !== 'mastered')
                  .map(t => (
                    <TermCard key={t.id} term={t} onProgress={handleProgress} />
                  ))}
              </>
            )}
            {terms.filter(t => t.progress.status === 'mastered').length > 0 && (
              <>
                <p className="text-xs font-black text-white/30 uppercase tracking-widest px-1 pt-2">Bereits gelernt</p>
                {terms
                  .filter(t => t.progress.status === 'mastered')
                  .map(t => (
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
