'use client'

import { useState } from 'react'
import { Plus, ListTodo, Bell, X } from 'lucide-react'
import { useTodos, Todo } from '@/lib/useTodos'
import { TodoDetailModal } from './TodoDetailModal'
import { formatDate } from '@/lib/utils'

function FullTodoModal({ onClose }: { onClose: () => void }) {
  const { todos, add, toggle, remove, update, isDue } = useTodos()
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<Todo | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    add(text)
    setText('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-panel rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {selected && (
          <TodoDetailModal
            todo={selected}
            onClose={() => setSelected(null)}
            onSave={patch => update(selected.id, patch)}
            onDelete={() => { remove(selected.id); setSelected(null) }}
          />
        )}

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 shrink-0">
          <div className="flex items-center gap-2">
            <ListTodo size={14} className="text-accent" />
            <h2 className="text-sm font-bold text-white">Alle Aufgaben</h2>
            {todos.length > 0 && (
              <span className="text-[10px] font-bold text-white/30 bg-white/8 rounded-lg px-2 py-0.5">{todos.length}</span>
            )}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 px-5 py-3 border-b border-white/6 shrink-0">
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

        <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1">
          {todos.length === 0 ? (
            <p className="text-sm text-white/35 text-center py-10 font-medium">Keine offenen Aufgaben.</p>
          ) : (
            todos.map(t => {
              const due = isDue(t)
              return (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="flex items-center gap-2.5 group px-3 py-2.5 rounded-xl hover:bg-panel-hover transition-colors cursor-pointer"
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggle(t.id) }}
                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 transition-all ${
                      t.done ? 'bg-accent-green border-accent-green' : 'border-white/20 hover:border-accent'
                    }`}
                  >
                    {t.done && <span className="w-2 h-2 rounded-full bg-dark" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-sm font-medium truncate ${t.done ? 'text-white/25 line-through' : 'text-white/85'}`}>
                      {t.text}
                    </span>
                    {t.reminderDate && !t.done && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold mt-0.5 ${due ? 'text-accent' : 'text-white/30'}`}>
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
    </div>
  )
}

export function TodoWidget() {
  const { todos, add, toggle, remove, update, isDue } = useTodos()
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<Todo | null>(null)
  const [showFull, setShowFull] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    add(text)
    setText('')
  }

  const open = todos.filter(t => !t.done)

  return (
    <div className="bg-panel rounded-2xl p-5 flex flex-col h-full">
      {selected && (
        <TodoDetailModal
          todo={selected}
          onClose={() => setSelected(null)}
          onSave={patch => update(selected.id, patch)}
          onDelete={() => { remove(selected.id); setSelected(null) }}
        />
      )}
      {showFull && <FullTodoModal onClose={() => setShowFull(false)} />}

      <button
        onClick={() => setShowFull(true)}
        className="flex items-center gap-2 mb-4 group text-left w-full"
      >
        <ListTodo size={14} className="text-accent" />
        <h2 className="text-sm font-bold text-white group-hover:text-white/70 transition-colors flex-1">To-Do</h2>
        {open.length > 0 && (
          <span className="text-[10px] font-bold text-white/30 bg-white/8 rounded-lg px-2 py-0.5">{open.length}</span>
        )}
      </button>

      <form onSubmit={submit} className="flex items-center gap-2 mb-3 shrink-0">
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

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0 -mx-1 px-1">
        {todos.length === 0 ? (
          <p className="text-sm text-white/35 text-center py-6 font-medium">Keine offenen Aufgaben.</p>
        ) : (
          todos.map(t => {
            const due = isDue(t)
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className="flex items-center gap-2.5 group px-2 py-2 rounded-xl hover:bg-panel-hover transition-colors cursor-pointer"
              >
                <button
                  onClick={e => { e.stopPropagation(); toggle(t.id) }}
                  className={`w-4.5 h-4.5 rounded-full shrink-0 flex items-center justify-center border-2 transition-all ${
                    t.done ? 'bg-accent-green border-accent-green' : 'border-white/20 hover:border-accent'
                  }`}
                >
                  {t.done && <span className="w-1.5 h-1.5 rounded-full bg-dark" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium truncate ${t.done ? 'text-white/25 line-through' : 'text-white/85'}`}>
                    {t.text}
                  </span>
                  {t.reminderDate && !t.done && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold mt-0.5 ${due ? 'text-accent' : 'text-white/30'}`}>
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
