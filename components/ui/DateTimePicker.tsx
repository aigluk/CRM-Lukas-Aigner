'use client'

import { useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Clock } from 'lucide-react'
import { useClickOutside } from '@/lib/useClickOutside'
import { isSameDay, toDateInput } from '@/lib/utils'

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function TimeColumn({
  values, value, onChange, unit,
}: { values: string[]; value: string; onChange: (v: string) => void; unit: string }) {
  const idx = values.indexOf(value)
  const prev = () => onChange(values[(idx - 1 + values.length) % values.length])
  const next = () => onChange(values[(idx + 1) % values.length])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button" onClick={prev}
        className="w-9 h-9 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 rounded-xl transition-all active:scale-90"
      >
        <ChevronUp size={18} />
      </button>
      <div className="w-14 h-12 flex items-center justify-center bg-white/8 rounded-xl">
        <span className="text-white font-black text-2xl tabular-nums">{value}</span>
      </div>
      <button
        type="button" onClick={next}
        className="w-9 h-9 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 rounded-xl transition-all active:scale-90"
      >
        <ChevronDown size={18} />
      </button>
      <span className="text-xs text-white/20 font-bold">{unit}</span>
    </div>
  )
}

export function TimePicker({ value, onChange, label, openUp }: { value: string; onChange: (v: string) => void; label?: string; openUp?: boolean }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useClickOutside(wrapRef, () => setOpen(false))

  const [h, m] = (value || '10:00').split(':')
  const closestM = MINUTES.reduce((best, mv) => Math.abs(+mv - +m) < Math.abs(+best - +m) ? mv : best, MINUTES[0])

  return (
    <div className="relative" ref={wrapRef}>
      {label && <label className="block text-xs font-black text-white/25 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 bg-dark rounded-xl px-3.5 py-3 text-sm text-white font-bold transition-all"
      >
        <Clock size={14} className="text-white/25 shrink-0" />
        {h}:{closestM} Uhr
      </button>

      {open && (
        <div className={`absolute z-50 ${openUp ? 'bottom-full mb-2' : 'mt-2'} bg-[#363636] border border-white/15 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)]`}>
          <div className="flex items-center gap-2">
            <TimeColumn values={HOURS} value={h} onChange={nh => onChange(`${nh}:${closestM}`)} unit="Std" />
            <span className="text-white/20 font-black text-2xl pb-6">:</span>
            <TimeColumn values={MINUTES} value={closestM} onChange={nm => onChange(`${h}:${nm}`)} unit="Min" />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full text-xs font-bold text-white bg-accent hover:opacity-90 py-2 rounded-xl transition-all"
          >
            OK
          </button>
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
          <span key={d} className="text-xs font-black text-white/20 text-center">{d}</span>
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

export function DatePicker({ value, onChange, label, openUp }: { value: string; onChange: (v: string) => void; label?: string; openUp?: boolean }) {
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
      {label && <label className="block text-xs font-black text-white/25 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 bg-dark rounded-xl px-3.5 py-3 text-sm text-white font-bold text-left transition-all"
      >
        <CalendarIcon size={14} className="text-white/25 shrink-0" />
        {display}
      </button>

      {open && (
        <div className={`absolute z-50 ${openUp ? 'bottom-full mb-2' : 'mt-2'} bg-[#363636] border border-white/15 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)] w-64`}>
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
