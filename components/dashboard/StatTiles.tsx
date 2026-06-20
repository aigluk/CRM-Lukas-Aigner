'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Lead } from '@/lib/types'
import { Users, Flame, CheckCircle2, Percent } from 'lucide-react'

type MonthPeriod = { month: number; year: number }
type Period = 'heute' | MonthPeriod | number

const ACTIVE_STATUSES = ['VERKAUFSGESPRÄCH', 'FOLLOW UP', 'CLOSING CALL']
const MONTHS = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

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
          isActive ? 'bg-accent text-white' : 'bg-panel text-white/40 hover:text-white/70'
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
          isActive ? 'bg-accent text-white' : 'bg-panel text-white/40 hover:text-white/70'
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

export function StatTiles({ leads }: { leads: Lead[] }) {
  const now = new Date()
  const [period, setPeriod] = useState<Period>({ month: now.getMonth(), year: now.getFullYear() })
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const filtered = leads.filter(l => inPeriod(l.status_date || l.updated_at, period))
  const total = leads.length
  const active = filtered.filter(l => ACTIVE_STATUSES.includes(l.status)).length
  const won = filtered.filter(l => l.status === 'ABSCHLUSS').length
  const rate = filtered.length > 0 ? Math.round((won / filtered.length) * 100) : 0

  function handleYearSelect(y: number) {
    setSelectedYear(y)
    setPeriod(y)
  }

  const tiles = [
    { label: 'Gesamt Leads',    value: total,      icon: Users,        iconBg: 'bg-white/12',     iconColor: 'text-white', href: '/leads' },
    { label: 'Aktive Pipeline', value: active,     icon: Flame,        iconBg: 'bg-accent',       iconColor: 'text-white', href: '/leads' },
    { label: 'Abschlüsse',      value: won,        icon: CheckCircle2, iconBg: 'bg-accent-green', iconColor: 'text-dark',  href: '/leads' },
    { label: 'Abschlussquote',  value: `${rate}%`, icon: Percent,      iconBg: 'bg-accent-green', iconColor: 'text-dark',  href: '/leads' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => setPeriod('heute')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            period === 'heute' ? 'bg-accent text-white' : 'bg-panel text-white/40 hover:text-white/70'
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(t => {
          const Icon = t.icon
          return (
            <Link
              key={t.label}
              href={t.href}
              className="bg-panel rounded-2xl p-5 hover:bg-panel-hover transition-colors block"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${t.iconBg}`}>
                <Icon
                  size={17}
                  strokeWidth={t.label === 'Aktive Pipeline' ? 0 : 2.75}
                  fill={t.label === 'Aktive Pipeline' ? 'currentColor' : 'none'}
                  className={t.iconColor}
                />
              </div>
              <p className="text-2xl font-black text-white leading-none">{t.value}</p>
              <p className="text-xs font-medium text-white/35 mt-2 leading-tight">{t.label}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
