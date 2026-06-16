'use client'

import { useState } from 'react'
import { Plus, X, ListTodo } from 'lucide-react'
import { useTodos } from '@/lib/useTodos'

export function TodoWidget() {
  const { todos, add, toggle, remove } = useTodos()
  const [text, setText] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    add(text)
    setText('')
  }

  return (
    <div className="bg-panel rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo size={14} className="text-accent" />
        <h2 className="text-sm font-black text-white">To-Do</h2>
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Neue Aufgabe…"
          className="flex-1 bg-dark rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 bg-accent disabled:opacity-30 text-white rounded-xl p-2.5 transition-all active:scale-95"
        >
          <Plus size={15} />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
        {todos.length === 0 ? (
          <p className="text-xs text-white/15 text-center py-6 font-medium">Keine offenen Aufgaben.</p>
        ) : (
          todos.map(t => (
            <div key={t.id} className="flex items-center gap-2.5 group px-2 py-2 rounded-xl hover:bg-panel-hover transition-colors">
              <button
                onClick={() => toggle(t.id)}
                className={`w-4.5 h-4.5 rounded-full shrink-0 flex items-center justify-center transition-all ${
                  t.done ? 'bg-accent-green' : 'bg-dark'
                }`}
              >
                {t.done && <span className="w-1.5 h-1.5 rounded-full bg-dark" />}
              </button>
              <span className={`flex-1 text-sm font-medium truncate ${t.done ? 'text-white/20 line-through' : 'text-white/70'}`}>
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-accent transition-all shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
