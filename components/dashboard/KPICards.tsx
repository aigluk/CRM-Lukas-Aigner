import { Lead } from '@/lib/types'

const STAGES = [
  { label: 'Neu',              status: 'NEU' as const,               color: 'bg-dark' },
  { label: 'Erst Kontakt',     status: 'ERST KONTAKT' as const,      color: 'bg-dark' },
  { label: 'Verkaufsgespräch', status: 'VERKAUFSGESPRÄCH' as const,  color: 'bg-accent' },
  { label: 'Zweiter Kontakt',  status: 'ZWEITER KONTAKT' as const,   color: 'bg-accent' },
  { label: 'Closing Call',     status: 'CLOSING CALL' as const,      color: 'bg-accent' },
  { label: 'Abschluss',        status: 'ABSCHLUSS' as const,         color: 'bg-accent-green' },
  { label: 'Bestandskunde',    status: 'BESTANDSKUNDE' as const,     color: 'bg-accent-green' },
]

export function KPICards({ leads }: { leads: Lead[] }) {
  const counts = STAGES.map(s => leads.filter(l => l.status === s.status).length)
  const max = Math.max(...counts, 1)

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col sm:flex-row gap-6 sm:gap-8">
      {/* Gesamt */}
      <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 sm:gap-1 sm:w-32 shrink-0 sm:border-r sm:border-dark/8 sm:pr-6">
        <span className="text-4xl font-black text-dark leading-none">{leads.length}</span>
        <span className="text-[10px] font-black text-dark/40 uppercase tracking-widest">Gesamt Leads</span>
      </div>

      {/* Bars */}
      <div className="flex-1 space-y-3">
        {STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-[10px] font-black text-dark/45 uppercase tracking-widest w-36 shrink-0 truncate">
              {s.label}
            </span>
            <div className="flex-1 h-3.5 bg-dark/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                style={{ width: `${(counts[i] / max) * 100}%` }}
              />
            </div>
            <span className="text-sm font-black text-dark w-6 text-right shrink-0">{counts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
