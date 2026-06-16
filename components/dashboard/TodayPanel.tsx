import { Lead } from '@/lib/types'
import { isSameDay } from '@/lib/utils'
import { CalendarClock, Phone } from 'lucide-react'

export function TodayPanel({ leads }: { leads: Lead[] }) {
  const today = new Date()
  const appts = leads
    .filter(l => l.appointment_date && isSameDay(new Date(l.appointment_date), today))
    .sort((a, b) => (a.appointment_from || '').localeCompare(b.appointment_from || ''))

  return (
    <div className="bg-panel rounded-2xl p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={14} className="text-accent" />
        <h2 className="text-sm font-black text-white">Heute</h2>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {appts.length === 0 ? (
          <p className="text-sm text-white/35 text-center py-6 font-medium">Keine Termine heute.</p>
        ) : (
          appts.map(l => (
            <div key={l.id} className="flex items-center gap-3 bg-dark rounded-xl px-3.5 py-2.5">
              <div className="bg-accent rounded-lg px-2 py-1 shrink-0">
                <p className="text-[11px] font-black text-white">{l.appointment_from || '—'}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{l.name}</p>
                {l.phone && (
                  <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-[11px] text-white/40 hover:text-accent transition-colors">
                    <Phone size={10} />{l.phone}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
