'use client'

import { useEffect, useState } from 'react'

export type ReminderRefType = 'lead' | 'customer'

export interface Reminder {
  id: string
  refType: ReminderRefType
  refId: string
  refName: string
  text: string
  createdAt: string
  done: boolean
}

const KEY = 'la-crm-reminders'

function read(): Reminder[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addReminder(entry: { refType: ReminderRefType; refId: string; refName: string; text: string }) {
  if (typeof window === 'undefined') return
  const reminders = read()
  reminders.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    done: false,
    ...entry,
  })
  localStorage.setItem(KEY, JSON.stringify(reminders))
  window.dispatchEvent(new Event('la-crm-reminders-changed'))
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setReminders(read())
    setLoaded(true)
    const sync = () => setReminders(read())
    window.addEventListener('la-crm-reminders-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('la-crm-reminders-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(reminders))
  }, [reminders, loaded])

  function toggle(id: string) {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r))
  }
  function remove(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  return { reminders, toggle, remove }
}
