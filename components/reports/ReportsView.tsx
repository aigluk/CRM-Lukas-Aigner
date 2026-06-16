'use client'

import { useMemo } from 'react'
import { Lead } from '@/lib/types'
import { STATUSES, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'

function DonutChart({ segments }: { segments: { color: string; pct: number; label: string; count: number }[] }) {
  let offset = 0
  const r    = 54
  const circ = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#2A2A2A" strokeWidth="12" />
        {segments.map((s, i) => {
          if (s.pct === 0) return null
          const dash = (s.pct / 100) * circ
          const el = (
            <circle
              key={i}
              cx="60" cy="60" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset * circ / 100}
              strokeLinecap="butt"
            />
          )
          offset += s.pct
          return el
        })}
      </svg>
      <ul className="space-y-1.5 flex-1 min-w-[140px]">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-gray-400 flex-1 truncate">{s.label}</span>
            <span className="font-bold text-white ml-auto">{s.count}</span>
            <span className="text-gray-600 w-9 text-right">{s.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const STATUS_HEX: Record<string, string> = {
  'NEU':                '#666666',
  'IN KONTAKT':         '#CCCCCC',
  'TERMIN FIXIERT':     '#FF5252',
  'ABSCHLUSS / ABSAGE': '#B9FBC0',
  'KEIN INTERESSE':     '#383838',
  'BESTANDSKUNDE':      '#B9FBC0',
  'NO GO':              '#282828',
}

export function ReportsView({ leads }: { leads: Lead[] }) {
  const total = leads.length

  const statusSegments = useMemo(() => STATUSES.map(s => ({
    label: STATUS_LABELS[s],
    count: leads.filter(l => l.status === s).length,
    pct:   total ? (leads.filter(l => l.status === s).length / total) * 100 : 0,
    color: STATUS_HEX[s] ?? '#555',
  })).filter(s => s.count > 0), [leads, total])

  const brancheMap = useMemo(() => {
    const map: Record<string, number> = {}
    leads.forEach(l => {
      const b = l.branche || l.industry || 'Unbekannt'
      map[b] = (map[b] ?? 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [leads])

  const conversionRate = total > 0
    ? ((leads.filter(l => l.status === 'ABSCHLUSS').length / total) * 100).toFixed(1)
    : '0'

  const appointmentRate = total > 0
    ? ((leads.filter(l => l.appointment_date).length / total) * 100).toFixed(1)
    : '0'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Reports</h1>
        <p className="text-sm text-white/30 mt-2 font-medium">{total} Leads analysiert</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {([
          { label: 'Gesamt Leads',   value: total,                                                        accent: true,  color: '' },
          { label: 'Termine',        value: leads.filter(l => l.appointment_date).length,                 accent: false, color: '#FF5252' },
          { label: 'Abschluss-Rate', value: `${conversionRate}%`,                                        accent: false, color: '#B9FBC0' },
          { label: 'Termin-Rate',    value: `${appointmentRate}%`,                                       accent: false, color: '#FFFFFF' },
        ] as const).map(({ label, value, accent, color }) => (
          <div key={label} className={`rounded-2xl p-5 ${accent ? 'bg-accent' : 'bg-panel'}`}>
            <p className="text-3xl font-black leading-none" style={{ color: accent ? '#fff' : color }}>{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Status distribution */}
        <div className="bg-panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-5">Status Verteilung</h2>
          {total === 0 ? (
            <p className="text-gray-600 text-sm">Keine Daten.</p>
          ) : (
            <DonutChart segments={statusSegments} />
          )}
        </div>

        {/* Branche breakdown */}
        <div className="bg-panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-5">Top Branchen</h2>
          {brancheMap.length === 0 ? (
            <p className="text-gray-600 text-sm">Keine Daten.</p>
          ) : (
            <ul className="space-y-2">
              {brancheMap.map(([b, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0
                return (
                  <li key={b}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{b}</span>
                      <span className="text-xs font-bold text-white">{count}</span>
                    </div>
                    <div className="h-1.5 bg-rim-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="bg-panel rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Pipeline Übersicht</h2>
        <div className="flex items-end gap-1 h-40">
          {STATUSES.map(s => {
            const count = leads.filter(l => l.status === s).length
            const pct   = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-white">{count}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(pct * 1.2, count > 0 ? 4 : 0)}%`,
                    background: STATUS_HEX[s] ?? '#333',
                    opacity: count > 0 ? 0.85 : 0.2,
                  }}
                />
                <span className="text-[9px] font-semibold text-gray-600 uppercase text-center leading-tight">
                  {STATUS_LABELS[s]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
