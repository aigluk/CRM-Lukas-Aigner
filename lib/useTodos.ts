'use client'

import { useEffect, useState } from 'react'

export interface Todo {
  id: string
  text: string
  done: boolean
  notes?: string
  reminderDate?: string
  reminderTime?: string
}

const KEY = 'la-crm-todos'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(KEY)
    if (raw) setTodos(JSON.parse(raw))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(todos))
  }, [todos, loaded])

  function add(text: string) {
    if (!text.trim()) return
    setTodos(prev => [{ id: crypto.randomUUID(), text: text.trim(), done: false }, ...prev])
  }
  function toggle(id: string) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  function remove(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }
  function update(id: string, patch: Partial<Todo>) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function isDue(t: Todo): boolean {
    if (t.done || !t.reminderDate) return false
    const time = t.reminderTime || '00:00'
    return new Date(`${t.reminderDate}T${time}`).getTime() <= Date.now()
  }

  return { todos, add, toggle, remove, update, isDue }
}
