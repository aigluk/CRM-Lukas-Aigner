'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Lead } from '@/lib/types'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'

type MonthPeriod = { month: number; year: number }
type Period = 'heute' | MonthPeriod | number

const MONTHS = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

const STAGE_RING_COLOR: Record<string, string> = {
  'NEU':             'rgba(26,26,26,0.35)',
  'VERKAUFSGESPRÄCH':'#FF5252',
  'FOLLOW UP':       'rgba(26,26,26,0.55)',
  'CLOSING CALL':    '#FF5252',
  'ABSCHLUSS':       '#5CB85C',
  'KEIN INTERESSE':  'rgba(26,26,26,0.2)',
  'NO GO':           'rgba(26,26,26,0.12)',
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
          isActive ? 'bg-accent text-white' : 'bg-dark/10 text-dark/55 hover:text-dark/80'
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
          isActive ? 'bg-accent text-white' : 'bg-dark/10 text-dark/55 hover:text-dark/80'
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

function Donut({ percent, color, value }: { percent: number; color: string; value: number }) {
  const size = 72
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(percent, 100) / 100) * c

  return (
    <div className="relative w-18 h-18 shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(26,26,26,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-black text-dark leading-none">{value}</span>
      </div>
    </div>
  )
}

export function KPICards({ leads }: { leads: Lead[] }) {
  const now = new Date()
  const [period, setPeriod] = useState<Period>({ month: now.getMonth(), year: now.getFullYear() })
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const filtered = leads.filter(l => inPeriod(l.status_date || l.updated_at, period))
  const counts = STATUSES.map(s => filtered.filter(l => l.status === s).length)
  const total = filtered.length || 1

  function handleYearSelect(y: number) {
    setSelectedYear(y)
    setPeriod(y)
  }

  return (
    <div className="bg-[#C7C7C7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-dark">Pipeline Übersicht</h2>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => setPeriod('heute')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              period === 'heute' ? 'bg-accent text-white' : 'bg-dark/10 text-dark/55 hover:text-dark/80'
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
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STATUSES.map((s, i) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-dark/50 text-center leading-tight">
              {STATUS_LABELS[s]}
            </span>
            <Donut percent={(counts[i] / total) * 100} color={STAGE_RING_COLOR[s]} value={counts[i]} />
          </div>
        ))}
      </div>
    </div>
  )
}
