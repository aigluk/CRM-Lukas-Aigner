'use client'

import { useRouter } from 'next/navigation'
import { BellRing, Check, Trash2, Users, Contact } from 'lucide-react'
import { useReminders, Reminder } from '@/lib/useReminders'
import { formatRelativeDateTime } from '@/lib/utils'

function targetUrl(r: Reminder): string {
  return r.refType === 'lead'
    ? `/leads?openLead=${r.refId}`
    : `/customers?openCustomer=${r.refId}`
}

export function ReminderWidget() {
  const { reminders, toggle, remove } = useReminders()
  const router = useRouter()
  const openCount = reminders.filter(r => !r.done).length

  return (
    <div className="bg-panel rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <BellRing size={15} strokeWidth={1.5} fill="currentColor" className="text-accent" />
        <h2 className="text-sm font-bold text-white flex-1">Erinnerungen</h2>
        {openCount > 0 && (
          <span className="text-[10px] font-bold text-white/30 bg-white/8 rounded-lg px-2 py-0.5">{openCount}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1 space-y-0.5">
        {reminders.length === 0 ? (
          <div className="h-full flex items-center justify-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/12 flex items-center justify-center">
              <BellRing size={30} strokeWidth={2.2} className="text-accent" />
            </div>
          </div>
        ) : (
          reminders.map(r => (
            <div
              key={r.id}
              onClick={() => router.push(targetUrl(r))}
              className="flex items-start gap-1 group px-1 py-2 rounded-xl hover:bg-panel-hover transition-colors cursor-pointer"
            >
              <button
                onClick={e => { e.stopPropagation(); toggle(r.id) }}
                title={r.done ? 'Als offen markieren' : 'Erledigt markieren'}
                className="shrink-0 p-2 -m-1"
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all ${
                  r.done ? 'bg-accent-green border-accent-green' : 'border-white/20 hover:border-accent-green'
                }`}>
                  {r.done && <Check size={10} className="text-dark" strokeWidth={3} />}
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {r.refType === 'lead'
                    ? <Users size={10} className="text-white/25 shrink-0" />
                    : <Contact size={10} className="text-white/25 shrink-0" />
                  }
                  <span className={`text-sm font-bold truncate ${r.done ? 'text-white/35 line-through' : 'text-white/85'}`}>{r.refName}</span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${r.done ? 'text-white/25 line-through' : 'text-white/45'}`}>{r.text}</p>
                <span className="text-[10px] text-white/25 font-medium">{formatRelativeDateTime(r.createdAt)}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(r.id) }}
                title="Endgültig löschen"
                className="shrink-0 text-white/25 hover:text-accent transition-all p-2 -m-1 rounded-lg hover:bg-white/8"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
