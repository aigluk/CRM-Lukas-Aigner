import { Lead } from '@/lib/types'

const STAGES = [
  { label: 'Neu',              status: 'NEU' as const,               color: 'bg-white/30' },
  { label: 'Erst Kontakt',     status: 'ERST KONTAKT' as const,      color: 'bg-white/50' },
  { label: 'Verkaufsgespräch', status: 'VERKAUFSGESPRÄCH' as const,  color: 'bg-accent' },
  { label: 'Zweiter Kontakt',  status: 'ZWEITER KONTAKT' as const,   color: 'bg-white/75' },
  { label: 'Closing Call',     status: 'CLOSING CALL' as const,      color: 'bg-accent' },
  { label: 'Abschluss',        status: 'ABSCHLUSS' as const,         color: 'bg-accent-green' },
  { label: 'Bestandskunde',    status: 'BESTANDSKUNDE' as const,     color: 'bg-accent-green' },
]

export function KPICards({ leads }: { leads: Lead[] }) {
  const counts = STAGES.map(s => leads.filter(l => l.status === s.status).length)
  const max = Math.max(...counts, 1)

  return (
    <div className="bg-panel rounded-2xl p-5">
      <h2 className="text-sm font-black text-white mb-5">Pipeline</h2>
      <div className="space-y-3">
        {STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest w-36 shrink-0 truncate">
              {s.label}
            </span>
            <div className="flex-1 h-3.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                style={{ width: `${(counts[i] / max) * 100}%` }}
              />
            </div>
            <span className="text-sm font-black text-white w-6 text-right shrink-0">{counts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
