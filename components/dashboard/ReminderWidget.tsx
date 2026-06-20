'use client'

import { useRouter } from 'next/navigation'
import { Bell, Check, Trash2, Users, Contact } from 'lucide-react'
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
  const open = reminders.filter(r => !r.done)

  return (
    <div className="bg-panel rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Bell size={14} className="text-accent" />
        <h2 className="text-sm font-bold text-white flex-1">Erinnerungen</h2>
        {open.length > 0 && (
          <span className="text-[10px] font-bold text-white/30 bg-white/8 rounded-lg px-2 py-0.5">{open.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1 space-y-0.5">
        {open.length === 0 ? (
          <p className="text-sm text-white/35 text-center py-6 font-medium">
            Keine Erinnerungen. Notizen &amp; Call-Häkchen bei Leads/Kunden erscheinen hier automatisch.
          </p>
        ) : (
          open.map(r => (
            <div
              key={r.id}
              onClick={() => router.push(targetUrl(r))}
              className="flex items-start gap-2.5 group px-2 py-2 rounded-xl hover:bg-panel-hover transition-colors cursor-pointer"
            >
              <button
                onClick={e => { e.stopPropagation(); toggle(r.id) }}
                title="Erledigt"
                className="mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center border-2 border-white/20 hover:border-accent-green hover:bg-accent-green/20 transition-all"
              >
                <Check size={9} className="opacity-0 group-hover:opacity-60 text-accent-green" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {r.refType === 'lead'
                    ? <Users size={10} className="text-white/25 shrink-0" />
                    : <Contact size={10} className="text-white/25 shrink-0" />
                  }
                  <span className="text-sm font-bold text-white/85 truncate">{r.refName}</span>
                </div>
                <p className="text-xs text-white/45 truncate mt-0.5">{r.text}</p>
                <span className="text-[10px] text-white/25 font-medium">{formatRelativeDateTime(r.createdAt)}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(r.id) }}
                className="opacity-0 group-hover:opacity-100 shrink-0 text-white/25 hover:text-accent transition-all p-1 rounded-lg hover:bg-white/8"
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
