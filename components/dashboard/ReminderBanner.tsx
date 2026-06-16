'use client'

import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { useTodos } from '@/lib/useTodos'

const DISMISSED_KEY = 'la-crm-dismissed-reminders'

function getDismissedToday(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return []
    const { date, ids } = JSON.parse(raw)
    return date === new Date().toDateString() ? ids : []
  } catch {
    return []
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: new Date().toDateString(), ids }))
}

export function ReminderBanner() {
  const { todos, isDue } = useTodos()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDismissed(getDismissedToday())
    setReady(true)
  }, [])

  const due = todos.filter(t => isDue(t) && !dismissed.includes(t.id))
  if (!ready || due.length === 0) return null

  function dismiss() {
    const ids = [...dismissed, ...due.map(t => t.id)]
    setDismissed(ids)
    saveDismissed(ids)
  }

  return (
    <div className="bg-accent rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap">
      <BellRing size={15} className="text-white shrink-0" />
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {due.map(t => (
          <span key={t.id} className="bg-white/15 rounded-xl px-3 py-1.5">
            <span className="text-sm font-medium text-white">{t.text}</span>
          </span>
        ))}
      </div>
      <button
        onClick={dismiss}
        className="text-white/60 hover:text-white transition-colors shrink-0"
        title="Ausblenden"
      >
        <X size={16} />
      </button>
    </div>
  )
}
