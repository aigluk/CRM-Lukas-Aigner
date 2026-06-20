'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Lead } from '@/lib/types'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'

type MonthPeriod = { month: number; year: number }
type Period = 'heute' | MonthPeriod | number

const MONTHS = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

const STAGE_COLORS: Record<string, string> = {
  'NEU':             'bg-white/30',
  'VERKAUFSGESPRÄCH':'bg-accent',
  'FOLLOW UP':       'bg-white/60',
  'CLOSING CALL':    'bg-accent',
  'ABSCHLUSS':       'bg-accent-green',
  'KEIN INTERESSE':  'bg-white/20',
  'NO GO':           'bg-white/10',
}

function inPeriod(dateStr: string | undefined, period: Period): boolean {
  const d = new Date(dateStr || '')
  if (isNaN(d.getTime())) return false
  const now = new Date()
  if (period === 'heute') return d.toDateString() === now.toDateString()
  if (typeof period === 'object') return d.getMonth() === period.month && d.getFullYear() === period.year
  return d.getFullYear() === period
}

function MonthDropdown({ period, onSelect }: {
  period: Period
  onSelect: (p: MonthPeriod) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = typeof period === 'object'
  const activeMonth = isActive ? (period as MonthPeriod).month : new Date().getMonth()
  const [pickerYear, setPickerYear] = useState(() =>
    isActive ? (period as MonthPeriod).year : new Date().getFullYear()
  )

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (!isActive) onSelect({ month: activeMonth, year: pickerYear })
          setOpen(o => !o)
        }}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
          isActive ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'
        }`}
      >
        {isActive ? `${MONTHS[activeMonth]} ${(period as MonthPeriod).year}` : 'Monat'}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#2a2a2a] rounded-xl z-20 shadow-xl border border-white/8 p-2 min-w-40">
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={() => setPickerYear(y => y - 1)}
              className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/8"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-xs font-bold text-white/70">{pickerYear}</span>
            <button
              onClick={() => setPickerYear(y => y + 1)}
              className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/8"
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-0.5">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => { onSelect({ month: i, year: pickerYear }); setOpen(false) }}
                className={`text-[11px] font-semibold py-1.5 rounded-lg transition-all ${
                  isActive && i === activeMonth && (period as MonthPeriod).year === pickerYear
                    ? 'bg-accent text-white'
                    : 'text-white/55 hover:text-white hover:bg-white/8'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function YearDropdown({ year, isActive, onSelect }: { year: number; isActive: boolean; onSelect: (y: number) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => current - i)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { onSelect(year); setOpen(o => !o) }}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
          isActive ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'
        }`}
      >
        {year} <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#2a2a2a] rounded-xl overflow-hidden z-20 shadow-xl border border-white/8 min-w-20">
          {years.map(y => (
            <button
              key={y}
              onClick={() => { onSelect(y); setOpen(false) }}
              className={`block w-full text-left px-4 py-2.5 text-xs font-semibold transition-all ${
                y === year && isActive ? 'text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function KPICards({ leads }: { leads: Lead[] }) {
  const now = new Date()
  const [period, setPeriod] = useState<Period>({ month: now.getMonth(), year: now.getFullYear() })
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const filtered = leads.filter(l => inPeriod(l.status_date || l.updated_at, period))
  const counts = STATUSES.map(s => filtered.filter(l => l.status === s).length)
  const max = Math.max(...counts, 1)

  function handleYearSelect(y: number) {
    setSelectedYear(y)
    setPeriod(y)
  }

  return (
    <div className="bg-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-white">Pipeline Übersicht</h2>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => setPeriod('heute')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              period === 'heute' ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'
            }`}
          >
            Heute
          </button>
          <MonthDropdown period={period} onSelect={p => setPeriod(p)} />
          <YearDropdown
            year={selectedYear}
            isActive={typeof period === 'number'}
            onSelect={handleYearSelect}
          />
        </div>
      </div>
      <div className="space-y-2.5">
        {STATUSES.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <span className="text-xs font-medium text-white/50 w-36 shrink-0 truncate">
              {STATUS_LABELS[s]}
            </span>
            <div className="flex-1 h-2.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${STAGE_COLORS[s]}`}
                style={{ width: `${(counts[i] / max) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white w-6 text-right shrink-0">{counts[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
