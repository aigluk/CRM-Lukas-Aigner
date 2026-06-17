'use client'

import { useState } from 'react'
import { X, Trash2, Bell, BellOff } from 'lucide-react'
import { Todo } from '@/lib/useTodos'
import { DatePicker, TimePicker } from '@/components/ui/DateTimePicker'

export function TodoDetailModal({
  todo, onClose, onSave, onDelete,
}: {
  todo: Todo
  onClose: () => void
  onSave: (patch: Partial<Todo>) => void
  onDelete: () => void
}) {
  const [text, setText]   = useState(todo.text)
  const [notes, setNotes] = useState(todo.notes ?? '')
  const [reminder, setReminder] = useState(!!todo.reminderDate)
  const [date, setDate]   = useState(todo.reminderDate ?? '')
  const [time, setTime]   = useState(todo.reminderTime ?? '09:00')

  function save() {
    onSave({
      text: text.trim() || todo.text,
      notes: notes.trim() || undefined,
      reminderDate: reminder ? date : undefined,
      reminderTime: reminder ? time : undefined,
    })
    onClose()
  }

  const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-panel rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-white">Aufgabe</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-white/25 mb-1.5">Titel</label>
            <input type="text" value={text} onChange={e => setText(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-black text-white/25 mb-1.5">Notizen</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Details, Kontext, Links…"
              className={`${inputCls} resize-none`}
            />
          </div>

          <button
            type="button"
            onClick={() => setReminder(r => !r)}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
              reminder ? 'bg-accent/15 text-accent' : 'bg-dark text-white/40'
            }`}
          >
            <span className="flex items-center gap-2">
              {reminder ? <Bell size={14} /> : <BellOff size={14} />}
              Erinnerung
            </span>
            <span className="text-xs font-black">
              {reminder ? 'An' : 'Aus'}
            </span>
          </button>

          {reminder && (
            <div className="grid grid-cols-2 gap-3">
              <DatePicker value={date} onChange={setDate} openUp />
              <TimePicker value={time} onChange={setTime} />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-2 bg-dark hover:bg-accent/15 text-white/40 hover:text-accent font-black text-sm py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={save}
              className="flex-1 bg-accent hover:opacity-90 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
