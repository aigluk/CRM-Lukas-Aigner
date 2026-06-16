'use client'

import { LeadStatus } from '@/lib/types'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'

const ACTIVE_STYLE: Record<LeadStatus, string> = {
  'NEU':             'bg-white text-[#1A1A1A]',
  'ERST KONTAKT':    'bg-white text-[#1A1A1A]',
  'ZWEITER KONTAKT': 'bg-white text-[#1A1A1A]',
  'VERKAUFSGESPRÄCH':'bg-accent text-white',
  'CLOSING CALL':    'bg-accent text-white',
  'ABSCHLUSS':       'bg-accent-green text-[#1A1A1A]',
  'KEIN INTERESSE':  'bg-[#383838] text-white/50',
  'BESTANDSKUNDE':   'bg-accent-green text-[#1A1A1A]',
  'NO GO':           'bg-[#2C2C2C] text-white/30',
}

export function PipelineTabs({
  activeStatus,
  counts,
  onStatusChange,
}: {
  activeStatus: LeadStatus
  counts: Partial<Record<string, number>>
  onStatusChange: (s: LeadStatus) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
      {STATUSES.map(status => {
        const active = status === activeStatus
        const count  = counts[status] ?? 0
        return (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              active
                ? ACTIVE_STYLE[status]
                : 'bg-panel text-white/25 hover:text-white/50 hover:bg-panel-hover'
            }`}
          >
            {STATUS_LABELS[status]}
            {count > 0 && (
              <span className={`text-[10px] min-w-4.5 h-4.5 inline-flex items-center justify-center rounded-md font-black px-1 ${
                active ? 'bg-black/15' : 'bg-panel-hover text-white/15'
              }`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
