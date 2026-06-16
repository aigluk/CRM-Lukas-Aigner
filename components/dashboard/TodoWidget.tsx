'use client'

import { useState } from 'react'
import { Plus, ListTodo, Bell } from 'lucide-react'
import { useTodos, Todo } from '@/lib/useTodos'
import { TodoDetailModal } from './TodoDetailModal'
import { formatDate } from '@/lib/utils'

export function TodoWidget() {
  const { todos, add, toggle, remove, update, isDue } = useTodos()
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<Todo | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    add(text)
    setText('')
  }

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col">
      {selected && (
        <TodoDetailModal
          todo={selected}
          onClose={() => setSelected(null)}
          onSave={patch => update(selected.id, patch)}
          onDelete={() => { remove(selected.id); setSelected(null) }}
        />
      )}

      <div className="flex items-center gap-2 mb-4">
        <ListTodo size={14} className="text-accent" />
        <h2 className="text-sm font-black text-dark">To-Do</h2>
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Neue Aufgabe…"
          className="flex-1 bg-dark/5 rounded-xl px-3 py-2.5 text-sm text-dark placeholder-dark/30 outline-none focus:ring-1 focus:ring-accent transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 bg-accent disabled:opacity-30 text-white rounded-xl p-2.5 transition-all active:scale-95"
        >
          <Plus size={15} />
        </button>
      </form>

      <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
        {todos.length === 0 ? (
          <p className="text-sm text-dark/35 text-center py-6 font-medium">Keine offenen Aufgaben.</p>
        ) : (
          todos.map(t => {
            const due = isDue(t)
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className="flex items-center gap-2.5 group px-2 py-2 rounded-xl hover:bg-dark/5 transition-colors cursor-pointer"
              >
                <button
                  onClick={e => { e.stopPropagation(); toggle(t.id) }}
                  className={`w-4.5 h-4.5 rounded-full shrink-0 flex items-center justify-center transition-all ${
                    t.done ? 'bg-accent-green' : 'bg-dark/10'
                  }`}
                >
                  {t.done && <span className="w-1.5 h-1.5 rounded-full bg-dark" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium truncate ${t.done ? 'text-dark/30 line-through' : 'text-dark'}`}>
                    {t.text}
                  </span>
                  {t.reminderDate && !t.done && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold mt-0.5 ${due ? 'text-accent' : 'text-dark/35'}`}>
                      <Bell size={9} />
                      {formatDate(t.reminderDate)}{t.reminderTime ? ` · ${t.reminderTime}` : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
