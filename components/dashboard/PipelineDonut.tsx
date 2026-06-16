import { Lead } from '@/lib/types'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'

const STATUS_HEX: Record<string, string> = {
  'NEU':              'rgba(255,255,255,0.3)',
  'ERST KONTAKT':     'rgba(255,255,255,0.5)',
  'VERKAUFSGESPRÄCH': '#FF5252',
  'ZWEITER KONTAKT':  'rgba(255,255,255,0.75)',
  'CLOSING CALL':     '#FF5252',
  'ABSCHLUSS':        '#B9FBC0',
  'KEIN INTERESSE':   'rgba(255,255,255,0.12)',
  'BESTANDSKUNDE':    '#B9FBC0',
  'NO GO':            'rgba(255,255,255,0.06)',
}

export function PipelineDonut({ leads }: { leads: Lead[] }) {
  const total = leads.length
  const segments = STATUSES.map(s => ({
    label: STATUS_LABELS[s],
    count: leads.filter(l => l.status === s).length,
    pct:   total ? (leads.filter(l => l.status === s).length / total) * 100 : 0,
    color: STATUS_HEX[s],
  })).filter(s => s.count > 0)

  let offset = 0
  const r    = 52
  const circ = 2 * Math.PI * r

  return (
    <div className="bg-panel rounded-2xl p-6">
      <h2 className="text-sm font-black text-white mb-5">Pipeline Verteilung</h2>
      {total === 0 ? (
        <p className="text-sm text-white/35 font-medium py-6 text-center">Noch keine Daten.</p>
      ) : (
        <div className="flex items-center gap-6 flex-wrap">
          <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0 -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            {segments.map((s, i) => {
              if (s.pct === 0) return null
              const dash = (s.pct / 100) * circ
              const el = (
                <circle
                  key={i} cx="60" cy="60" r={r}
                  fill="none" stroke={s.color} strokeWidth="12"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-offset * circ / 100}
                  strokeLinecap="butt"
                />
              )
              offset += s.pct
              return el
            })}
          </svg>
          <ul className="space-y-1.5 flex-1 min-w-35">
            {segments.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-white/55 flex-1 truncate">{s.label}</span>
                <span className="font-bold text-white ml-auto">{s.count}</span>
                <span className="text-white/30 w-9 text-right">{s.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
