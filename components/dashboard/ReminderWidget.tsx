'use client'

import { useRouter } from 'next/navigation'
import { BellRing, Check, Trash2 } from 'lucide-react'
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
    <div className="bg-[#C7C7C7] rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <BellRing size={15} strokeWidth={1.5} fill="currentColor" className="text-accent" />
        <h2 className="text-sm font-bold text-dark flex-1">Erinnerungen</h2>
        {openCount > 0 && (
          <span className="text-[10px] font-bold text-dark/45 bg-dark/8 rounded-lg px-2 py-0.5">{openCount}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1 space-y-0.5">
        {reminders.length === 0 ? (
          <div className="h-full flex items-center justify-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-dark/8 flex items-center justify-center">
              <BellRing size={30} strokeWidth={2.2} className="text-dark/40" />
            </div>
          </div>
        ) : (
          reminders.map(r => (
            <div
              key={r.id}
              onClick={() => router.push(targetUrl(r))}
              className="flex items-start gap-1 group px-1 py-2 rounded-xl hover:bg-white/50 transition-colors cursor-pointer"
            >
              <button
                onClick={e => { e.stopPropagation(); toggle(r.id) }}
                title={r.done ? 'Als offen markieren' : 'Erledigt markieren'}
                className="shrink-0 p-2 -m-1"
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all ${
                  r.done ? 'bg-accent-green border-accent-green' : 'border-dark/25 hover:border-accent-green'
                }`}>
                  {r.done && <Check size={10} className="text-dark" strokeWidth={3} />}
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-bold truncate block ${r.done ? 'text-dark/35 line-through' : 'text-dark/85'}`}>{r.refName}</span>
                <p className={`text-xs truncate mt-0.5 ${r.done ? 'text-dark/25 line-through' : 'text-dark/50'}`}>{r.text}</p>
                <span className="text-[10px] text-dark/35 font-medium">{formatRelativeDateTime(r.createdAt)}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(r.id) }}
                title="Endgültig löschen"
                className="shrink-0 text-dark/35 hover:text-accent transition-all p-2 -m-1 rounded-lg hover:bg-dark/8"
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
