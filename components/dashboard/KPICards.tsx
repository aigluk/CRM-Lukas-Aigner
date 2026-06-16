'use client'

import { useState } from 'react'
import { Lead } from '@/lib/types'

type Period = 'heute' | 'monat' | 'jahr'

const ACTIVE_STAGES = [
  { label: 'Neu',              status: 'NEU' as const,               color: 'bg-white/30' },
  { label: 'Verkaufsgespräch', status: 'VERKAUFSGESPRÄCH' as const,  color: 'bg-accent' },
  { label: 'Follow Up',        status: 'FOLLOW UP' as const,         color: 'bg-white/60' },
  { label: 'Closing Call',     status: 'CLOSING CALL' as const,      color: 'bg-accent' },
]

const PERIODS: { key: Period; label: string }[] = [
  { key: 'heute', label: 'Heute' },
  { key: 'monat', label: 'Monat' },
  { key: 'jahr', label: 'Jahr' },
]

function inPeriod(dateStr: string | undefined, period: Period): boolean {
  const d = new Date(dateStr || '')
  if (isNaN(d.getTime())) return false
  const now = new Date()
  if (period === 'heute') return d.toDateString() === now.toDateString()
  if (period === 'monat') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return d.getFullYear() === now.getFullYear()
}

export function KPICards({ leads }: { leads: Lead[] }) {
  const [period, setPeriod] = useState<Period>('monat')

  const filtered = leads.filter(l => inPeriod(l.status_date || l.updated_at, period))
  const counts = ACTIVE_STAGES.map(s => filtered.filter(l => l.status === s.status).length)
  const max = Math.max(...counts, 1)

  return (
    <div className="bg-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-white">Aktive Pipeline</h2>
        <div className="flex items-center gap-1.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p.key
                  ? 'bg-accent text-white'
                  : 'bg-dark text-white/40 hover:text-white/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {ACTIVE_STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-xs font-medium text-white/50 w-36 shrink-0 truncate">
              {s.label}
            </span>
            <div className="flex-1 h-3 bg-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                style={{ width: `${(counts[i] / max) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white w-6 text-right shrink-0">{counts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
