'use client'

import { useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { useTodos } from '@/lib/useTodos'

export function ReminderBanner() {
  const { todos, isDue, toggle } = useTodos()
  const [dismissed, setDismissed] = useState<string[]>([])

  const due = todos.filter(t => isDue(t) && !dismissed.includes(t.id))
  if (due.length === 0) return null

  return (
    <div className="bg-accent rounded-2xl px-5 py-4 mb-5 flex items-center gap-3 flex-wrap">
      <BellRing size={16} className="text-white shrink-0" />
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {due.map(t => (
          <span key={t.id} className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
            <span className="text-sm font-bold text-white">{t.text}</span>
            <button
              onClick={() => toggle(t.id)}
              className="text-[10px] font-black text-white/70 hover:text-white uppercase tracking-widest"
            >
              Erledigt
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={() => setDismissed(prev => [...prev, ...due.map(t => t.id)])}
        className="text-white/60 hover:text-white transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}
