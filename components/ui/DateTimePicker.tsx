'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useClickOutside } from '@/lib/useClickOutside'
import { isSameDay, toDateInput } from '@/lib/utils'

const ITEM_H = 36

function WheelColumn({
  values, value, onChange,
}: { values: string[]; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const userScrolling = useRef(false)

  useEffect(() => {
    const idx = values.indexOf(value)
    if (ref.current && idx >= 0 && !userScrolling.current) {
      ref.current.scrollTop = idx * ITEM_H
    }
  }, [value, values])

  function onScroll() {
    userScrolling.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      userScrolling.current = false
      if (!ref.current) return
      const idx = Math.round(ref.current.scrollTop / ITEM_H)
      const v = values[Math.max(0, Math.min(values.length - 1, idx))]
      if (v && v !== value) onChange(v)
    }, 120)
  }

  return (
    <div className="relative h-27 w-14 overflow-hidden">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-9 bg-white/8 rounded-lg pointer-events-none" />
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-scroll scrollbar-none snap-y snap-mandatory"
        style={{ paddingTop: ITEM_H, paddingBottom: ITEM_H }}
      >
        {values.map(v => (
          <div
            key={v}
            onClick={() => onChange(v)}
            className={`h-9 flex items-center justify-center snap-center cursor-pointer text-sm font-black transition-colors ${
              v === value ? 'text-white' : 'text-white/20'
            }`}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  )
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

export function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useClickOutside(wrapRef, () => setOpen(false))

  const [h, m] = (value || '10:00').split(':')
  const closestM = MINUTES.reduce((best, mv) => Math.abs(+mv - +m) < Math.abs(+best - +m) ? mv : best, MINUTES[0])

  return (
    <div className="relative" ref={wrapRef}>
      {label && <label className="block text-[10px] font-black text-white/25 tracking-wide mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 bg-dark rounded-xl px-3.5 py-3 text-sm text-white font-bold transition-all"
      >
        <Clock size={14} className="text-white/25 shrink-0" />
        {h}:{closestM} Uhr
      </button>

      {open && (
        <div className="absolute z-50 mt-2 bg-panel rounded-2xl p-3 shadow-2xl flex items-center gap-1">
          <WheelColumn values={HOURS} value={h} onChange={nh => onChange(`${nh}:${closestM}`)} />
          <span className="text-white/15 font-black text-sm">:</span>
          <WheelColumn values={MINUTES} value={closestM} onChange={nm => onChange(`${h}:${nm}`)} />
        </div>
      )}
    </div>
  )
}

function MonthGrid({
  viewDate, selected, onSelect,
}: { viewDate: Date; selected: Date | null; onSelect: (d: Date) => void }) {
  const today  = new Date()
  const year   = viewDate.getFullYear()
  const month  = viewDate.getMonth()
  const first  = new Date(year, month, 1)
  const last   = new Date(year, month + 1, 0)
  const startDay = (first.getDay() + 6) % 7
  const days: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <span key={d} className="text-[9px] font-black text-white/20 text-center">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const isSel   = selected && isSameDay(d, selected)
          const isToday = isSameDay(d, today)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(d)}
              className={`h-7.5 w-7.5 rounded-lg text-xs font-bold transition-all ${
                isSel ? 'bg-accent text-white' : isToday ? 'text-accent' : 'text-white/45 hover:bg-white/8 hover:text-white'
              }`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DatePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : null
  const [viewDate, setViewDate] = useState(selected || new Date())
  const wrapRef = useRef<HTMLDivElement>(null)
  useClickOutside(wrapRef, () => setOpen(false))

  function prevMonth() { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d) }
  function nextMonth() { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d) }

  const display = selected
    ? selected.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Datum wählen'

  return (
    <div className="relative" ref={wrapRef}>
      {label && <label className="block text-[10px] font-black text-white/25 tracking-wide mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 bg-dark rounded-xl px-3.5 py-3 text-sm text-white font-bold text-left transition-all"
      >
        <CalendarIcon size={14} className="text-white/25 shrink-0" />
        {display}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 bg-panel rounded-2xl p-4 shadow-2xl w-64">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 text-white/30 hover:text-white transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-black text-white capitalize">
              {viewDate.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 text-white/30 hover:text-white transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
          <MonthGrid
            viewDate={viewDate}
            selected={selected}
            onSelect={d => { onChange(toDateInput(d)); setOpen(false) }}
          />
        </div>
      )}
    </div>
  )
}
