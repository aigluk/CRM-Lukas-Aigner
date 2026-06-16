'use client'

import { useRouter } from 'next/navigation'
import { Lead } from '@/lib/types'
import { isSameDay } from '@/lib/utils'
import { CalendarClock, Phone } from 'lucide-react'

export function TodayPanel({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const today = new Date()
  const appts = leads
    .filter(l => l.appointment_date && isSameDay(new Date(l.appointment_date), today))
    .sort((a, b) => (a.appointment_from || '').localeCompare(b.appointment_from || ''))

  return (
    <div
      className="bg-panel rounded-2xl p-5 flex flex-col cursor-pointer hover:bg-panel-hover transition-colors h-full"
      onClick={() => router.push('/calendar')}
    >
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={14} className="text-accent" />
        <h2 className="text-sm font-bold text-white">Heute</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {appts.length === 0 ? (
          <p className="text-sm text-white/35 text-center py-6 font-medium">Keine Termine heute.</p>
        ) : (
          appts.map(l => (
            <div key={l.id} className="flex items-center gap-3 bg-dark rounded-xl px-3.5 py-2.5">
              <div className="bg-accent rounded-lg px-2 py-1 shrink-0">
                <p className="text-[11px] font-bold text-white">{l.appointment_from || '—'}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{l.name}</p>
                {l.phone && (
                  <a
                    href={`tel:${l.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] text-white/40 hover:text-accent transition-colors"
                  >
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
