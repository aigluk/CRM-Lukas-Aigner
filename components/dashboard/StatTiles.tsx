'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lead } from '@/lib/types'
import { Users, Flame, CheckCircle2, Percent } from 'lucide-react'

type Period = 'heute' | 'monat' | 'jahr'

const ACTIVE_STATUSES = ['NEU', 'VERKAUFSGESPRÄCH', 'FOLLOW UP', 'CLOSING CALL']

const PERIODS: { key: Period; label: string }[] = [
  { key: 'heute', label: 'Heute' },
  { key: 'monat', label: 'Monat' },
  { key: 'jahr', label: 'Jahr' },
]

function inPeriod(dateStr: string | undefined, period: Period): boolean {
  const d = new Date(dateStr || '')
  if (isNaN(d.getTime())) return false
  const now = new Date()
  if (period === 'heute') return d.toDateString() === now.toDateString()
  if (period === 'monat') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return d.getFullYear() === now.getFullYear()
}

export function StatTiles({ leads }: { leads: Lead[] }) {
  const [period, setPeriod] = useState<Period>('monat')

  const filtered = leads.filter(l => inPeriod(l.status_date || l.updated_at, period))
  const total = leads.length
  const active = filtered.filter(l => ACTIVE_STATUSES.includes(l.status)).length
  const won = filtered.filter(l => l.status === 'ABSCHLUSS').length
  const rate = filtered.length > 0 ? Math.round((won / filtered.length) * 100) : 0

  const tiles = [
    { label: 'Gesamt Leads',    value: total,      icon: Users,        iconBg: 'bg-white/12',     iconColor: 'text-white', href: '/leads' },
    { label: 'Aktive Pipeline', value: active,     icon: Flame,        iconBg: 'bg-accent',       iconColor: 'text-white', href: '/leads' },
    { label: 'Abschlüsse',      value: won,        icon: CheckCircle2, iconBg: 'bg-accent-green', iconColor: 'text-dark',  href: '/leads' },
    { label: 'Abschlussquote',  value: `${rate}%`, icon: Percent,      iconBg: 'bg-accent-green', iconColor: 'text-dark',  href: '/leads' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1.5">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              period === p.key
                ? 'bg-accent text-white'
                : 'bg-panel text-white/40 hover:text-white/70'
            }`}
          >
            {p.label}
          </button>
        ))}
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
