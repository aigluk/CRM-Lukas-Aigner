'use client'

import { LeadStatus } from '@/lib/types'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'

const ACTIVE_STYLE: Record<LeadStatus, string> = {
  'NEU':             'bg-accent text-white',
  'VERKAUFSGESPRÄCH':'bg-accent text-white',
  'FOLLOW UP':       'bg-accent text-white',
  'CLOSING CALL':    'bg-accent text-white',
  'ABSCHLUSS':       'bg-accent-green text-white',
  'KEIN INTERESSE':  'bg-dark text-white',
  'NO GO':           'bg-dark text-white',
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
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
      {STATUSES.map(status => {
        const active = status === activeStatus
        const count  = counts[status] ?? 0
        return (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
              active
                ? ACTIVE_STYLE[status]
                : 'bg-panel text-dark/45 hover:text-dark'
            }`}
          >
            {STATUS_LABELS[status]}
            {count > 0 && (
              <span className={`text-[10px] min-w-4.5 h-4.5 inline-flex items-center justify-center rounded-md font-black px-1 ${
                active ? 'bg-white/20' : 'bg-dark/8 text-dark/50'
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
