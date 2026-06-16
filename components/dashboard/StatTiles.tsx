'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Lead } from '@/lib/types'
import { Users, Flame, CheckCircle2, Percent } from 'lucide-react'

type Period = 'heute' | 'monat' | number

const ACTIVE_STATUSES = ['NEU', 'VERKAUFSGESPRÄCH', 'FOLLOW UP', 'CLOSING CALL']

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
  const [period, setPeriod] = useState<Period>('monat')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

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
        {(['heute', 'monat'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              period === p ? 'bg-accent text-white' : 'bg-panel text-white/40 hover:text-white/70'
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
                <Icon size={16} className={t.iconColor} />
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
