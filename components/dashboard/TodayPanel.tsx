'use client'

import { useRouter } from 'next/navigation'
import { Lead } from '@/lib/types'
import { isSameDay } from '@/lib/utils'
import { Phone } from 'lucide-react'

export function TodayPanel({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const today = new Date()

  const appts = leads
    .filter(l => l.appointment_date && isSameDay(new Date(l.appointment_date), today))
    .sort((a, b) => (a.appointment_from || '').localeCompare(b.appointment_from || ''))

  const dayNum = today.getDate()
  const weekday = today.toLocaleDateString('de-AT', { weekday: 'long' })
  const monthYear = today.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })

  return (
    <div
      className="bg-panel rounded-2xl p-5 flex flex-col cursor-pointer hover:bg-panel-hover transition-colors h-full"
      onClick={() => router.push('/calendar')}
    >
      {/* Date header — always visible */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-white leading-none">{dayNum}</span>
        </div>
        <div className="min-w-0">
          <p className="text-base font-black text-white capitalize leading-tight">{weekday}</p>
          <p className="text-xs text-white/35 capitalize mt-0.5">{monthYear}</p>
          {appts.length > 0 && (
            <p className="text-[10px] font-bold text-accent mt-1">
              {appts.length} {appts.length === 1 ? 'Termin' : 'Termine'} heute
            </p>
          )}
        </div>
      </div>

      {/* Appointment list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        {appts.length === 0 ? (
          <p className="text-xs text-white/25 font-medium">Keine Termine heute</p>
        ) : (
          appts.map(l => (
            <div key={l.id} className="flex items-center gap-3 bg-dark rounded-xl px-3 py-2.5">
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
