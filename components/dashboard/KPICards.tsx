'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Lead } from '@/lib/types'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'

type Period = 'heute' | 'monat' | number

const STAGE_COLORS: Record<string, string> = {
  'NEU':             'bg-white/30',
  'VERKAUFSGESPRÄCH':'bg-accent',
  'FOLLOW UP':       'bg-white/60',
  'CLOSING CALL':    'bg-accent',
  'ABSCHLUSS':       'bg-accent-green',
  'KEIN INTERESSE':  'bg-white/20',
  'BESTANDSKUNDE':   'bg-accent-green/60',
  'NO GO':           'bg-white/10',
}

function inPeriod(dateStr: string | undefined, period: Period): boolean {
  const d = new Date(dateStr || '')
  if (isNaN(d.getTime())) return false
  const now = new Date()
  if (period === 'heute') return d.toDateString() === now.toDateString()
  if (period === 'monat') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return d.getFullYear() === period
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
  const [period, setPeriod] = useState<Period>('monat')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

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
        <div className="flex items-center gap-1.5">
          {(['heute', 'monat'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${
                period === p ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'
              }`}
            >
              {p === 'heute' ? 'Heute' : 'Monat'}
            </button>
          ))}
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
