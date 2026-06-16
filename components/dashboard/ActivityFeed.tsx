import { Lead } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Activity } from 'lucide-react'

export function ActivityFeed({ leads, compact }: { leads: Lead[]; compact?: boolean }) {
  const recent = [...leads]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, compact ? 8 : 15)

  if (compact) {
    return (
      <div className="bg-panel rounded-2xl p-5 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-white/30" />
          <h2 className="text-sm font-black text-white">Letzte Aktivitäten</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {recent.length === 0 ? (
            <p className="text-xs text-white/15 text-center py-6 font-medium">Noch keine Leads vorhanden.</p>
          ) : (
            recent.map(lead => {
              const sc = STATUS_COLORS[lead.status]
              return (
                <div key={lead.id} className="flex items-center gap-2.5 px-1 py-2 rounded-xl hover:bg-panel-hover transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                  <span className="text-sm font-bold text-white truncate flex-1">{lead.name}</span>
                  <span className="text-[10px] text-white/20 shrink-0">{formatDate(lead.status_date || lead.updated_at)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      <div className="px-6 py-4 flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-white">Letzte Aktivitäten</h2>
        <span className="text-xs text-white/30">{leads.length} Leads gesamt</span>
      </div>

      {recent.length === 0 ? (
        <div className="px-6 pb-12 pt-4 text-center text-white/20 text-sm">
          Noch keine Leads vorhanden.
        </div>
      ) : (
        <div>
          <div className="hidden md:grid grid-cols-[1fr_140px_120px_90px] gap-4 px-6 pb-2">
            {['Unternehmen', 'Branche / Stadt', 'Status', 'Datum'].map(h => (
              <span key={h} className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{h}</span>
            ))}
          </div>

          {recent.map((lead, i) => {
            const sc = STATUS_COLORS[lead.status]
            return (
              <div
                key={lead.id}
                className={`grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_120px_90px] gap-4 items-center px-6 py-3 hover:bg-panel-hover transition-colors ${
                  i < recent.length - 1 ? 'border-b border-panel-2' : ''
                }`}
              >
                <p className="text-sm font-semibold text-white truncate">{lead.name}</p>

                <p className="hidden md:block text-xs text-white/30 truncate">
                  {[lead.branche || lead.industry, lead.city || lead.region].filter(Boolean).join(' · ') || '—'}
                </p>

                <span className={`hidden md:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-lg w-fit ${sc.bg} ${sc.text}`}>
                  {STATUS_LABELS[lead.status]}
                </span>

                <span className="text-[11px] text-white/30 text-right md:text-left">
                  {formatDate(lead.status_date || lead.updated_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
