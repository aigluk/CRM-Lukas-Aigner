'use client'

import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useReminders, Reminder } from '@/lib/useReminders'

const SEEN_KEY = 'la-crm-seen-reminders'

function getSeen(): string[] {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSeen(ids: string[]) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify(ids))
}

function targetUrl(r: Reminder): string {
  return r.refType === 'lead' ? `/leads?openLead=${r.refId}` : `/customers?openCustomer=${r.refId}`
}

export function ReminderBanner() {
  const { reminders } = useReminders()
  const router = useRouter()
  const [seen, setSeen] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSeen(getSeen())
    setReady(true)
  }, [])

  const unseen = reminders.filter(r => !r.done && !seen.includes(r.id))
  if (!ready || unseen.length === 0) return null

  function dismiss(id?: string) {
    const ids = id ? [...seen, id] : [...seen, ...unseen.map(r => r.id)]
    setSeen(ids)
    saveSeen(ids)
  }

  // Fixed/floating popup — never part of page layout, so it can't push content down.
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-80">
      {unseen.slice(0, 3).map(r => (
        <div key={r.id} className="bg-accent rounded-2xl px-4 py-3 flex items-start gap-2.5 shadow-2xl">
          <BellRing size={14} className="text-white shrink-0 mt-0.5" />
          <button
            onClick={() => { dismiss(r.id); router.push(targetUrl(r)) }}
            className="flex-1 text-left min-w-0"
          >
            <p className="text-xs font-bold text-white truncate">{r.refName}</p>
            <p className="text-xs text-white/80 truncate">{r.text}</p>
          </button>
          <button onClick={() => dismiss(r.id)} className="text-white/60 hover:text-white transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
      {unseen.length > 1 && (
        <button onClick={() => dismiss()} className="text-[11px] text-white/50 hover:text-white font-bold self-end">
          Alle ausblenden
        </button>
      )}
    </div>
  )
}
