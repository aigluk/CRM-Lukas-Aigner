import { Lead } from '@/lib/types'
import { Users, Flame, CheckCircle2, Percent } from 'lucide-react'

const ACTIVE_STATUSES = ['NEU', 'ERST KONTAKT', 'VERKAUFSGESPRÄCH', 'ZWEITER KONTAKT', 'CLOSING CALL']

export function StatTiles({ leads }: { leads: Lead[] }) {
  const total = leads.length
  const active = leads.filter(l => ACTIVE_STATUSES.includes(l.status)).length
  const won = leads.filter(l => l.status === 'ABSCHLUSS').length
  const rate = total > 0 ? Math.round((won / total) * 100) : 0

  const tiles = [
    { label: 'Gesamt Leads',     value: total,  icon: Users,        iconBg: 'bg-white/12', iconColor: 'text-white' },
    { label: 'Aktive Pipeline',  value: active, icon: Flame,        iconBg: 'bg-accent',   iconColor: 'text-white' },
    { label: 'Abschlüsse',       value: won,    icon: CheckCircle2, iconBg: 'bg-accent-green', iconColor: 'text-dark' },
    { label: 'Abschlussquote',   value: `${rate}%`, icon: Percent,  iconBg: 'bg-accent-green', iconColor: 'text-dark' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map(t => {
        const Icon = t.icon
        return (
          <div key={t.label} className="bg-panel rounded-2xl p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${t.iconBg}`}>
              <Icon size={16} className={t.iconColor} />
            </div>
            <p className="text-2xl font-black text-white leading-none">{t.value}</p>
            <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mt-2 leading-tight">{t.label}</p>
          </div>
        )
      })}
    </div>
  )
}
