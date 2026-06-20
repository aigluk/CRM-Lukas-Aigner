'use client'

import { BellRing, X, Clock, Users, Contact } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useReminders, Reminder } from '@/lib/useReminders'
import { formatDate } from '@/lib/utils'

function targetUrl(r: Reminder): string {
  return r.refType === 'lead' ? `/leads?openLead=${r.refId}` : `/customers?openCustomer=${r.refId}`
}

export function ReminderBanner() {
  const { reminders, markSeen, snooze } = useReminders()
  const router = useRouter()
  const now = Date.now()

  const due = reminders.filter(r =>
    r.manual && !r.done && !r.seen && (!r.remindAt || new Date(r.remindAt).getTime() <= now)
  )

  if (due.length === 0) return null
  const r = due[0]

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-panel rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-rim-subtle">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center">
            <BellRing size={20} strokeWidth={2} fill="currentColor" className="text-white" />
          </div>
          <button
            onClick={() => markSeen(r.id)}
            className="text-white/40 hover:text-white transition-colors p-2 -m-2"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-1.5">
          {r.refType === 'lead'
            ? <Users size={11} className="text-white/35 shrink-0" />
            : <Contact size={11} className="text-white/35 shrink-0" />
          }
          <p className="text-xs font-bold text-white/50">{r.refName}</p>
        </div>
        <p className="text-base font-bold text-white mb-1">Erinnerung</p>
        <p className="text-sm text-white/65 mb-6">{r.text}</p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { markSeen(r.id); router.push(targetUrl(r)) }}
            className="flex-1 bg-accent hover:bg-accent/90 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            Öffnen
          </button>
          <button
            onClick={() => snooze(r.id, 24)}
            title="Morgen nochmal erinnern"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 text-sm font-bold transition-colors"
          >
            <Clock size={14} />
            Später
          </button>
        </div>

        {r.remindAt && (
          <p className="text-[11px] text-white/25 text-center mt-4 font-medium">
            Geplant für {formatDate(r.remindAt)} · {new Date(r.remindAt).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })} Uhr
          </p>
        )}
      </div>
    </div>
  )
}
