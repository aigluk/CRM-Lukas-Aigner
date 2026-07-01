'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useClickOutside } from '@/lib/useClickOutside'
import { toDateInput, isSameDay } from '@/lib/utils'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const PANEL_W = 272
const PANEL_H = 320
const GAP = 8
const EDGE_PAD = 8

function parseDateInput(v: string): Date | null {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Datum wählen',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const selected = parseDateInput(value)
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date())
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useClickOutside(ref, () => setOpen(false))

  function openPicker() {
    setViewMonth(selected ?? new Date())
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      const vw = window.innerWidth
      const vh = window.innerHeight

      // Vertical: prefer below, flip above if not enough space
      const shouldOpenUp = vh - rect.bottom < PANEL_H + GAP && rect.top > PANEL_H + GAP
      setOpenUp(shouldOpenUp)

      // Horizontal: left-align to button, clamp so it never goes off-screen
      const rawLeft = rect.left
      const clampedLeft = Math.min(rawLeft, vw - PANEL_W - EDGE_PAD)
      const left = Math.max(EDGE_PAD, clampedLeft)

      setPopStyle(
        shouldOpenUp
          ? { position: 'fixed', bottom: vh - rect.top + GAP, left, width: PANEL_W }
          : { position: 'fixed', top: rect.bottom + GAP, left, width: PANEL_W }
      )
    }
    setOpen(true)
  }

  function pick(d: Date) {
    onChange(toDateInput(d))
    setOpen(false)
  }

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center justify-between gap-2 ${className}`}
      >
        <span className={selected ? 'text-white' : 'text-white/30'}>
          {selected
            ? selected.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : placeholder}
        </span>
        <CalendarIcon size={15} className="text-accent shrink-0" />
      </button>

      {open && (
        <div
          className={`z-[200] bg-panel-2 border border-white/10 rounded-2xl shadow-2xl p-3 animate-in fade-in duration-150 ${
            openUp ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'
          }`}
          style={popStyle}
        >
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-bold text-white">{MONTHS[month]} {year}</span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-[10px] font-bold text-white/25 text-center py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const isSelected = selected && isSameDay(d, selected)
              const isToday = isSameDay(d, today)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(d)}
                  className={`w-8 h-8 text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-accent text-white'
                      : isToday
                      ? 'text-accent bg-accent/10 hover:bg-accent/20'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => pick(new Date())}
            className="w-full mt-2.5 text-[11px] font-bold text-accent hover:text-accent-hover transition-all py-1"
          >
            Heute
          </button>
        </div>
      )}
    </div>
  )
}
