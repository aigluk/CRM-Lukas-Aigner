'use client'

import { Lead } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { Phone, Mail, ChevronRight } from 'lucide-react'

export function LeadTable({
  leads,
  onLeadClick,
}: {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}) {
  if (leads.length === 0) {
    return (
      <div className="bg-panel rounded-2xl py-16 text-center">
        <p className="text-gray-700 text-sm">Keine Leads in dieser Kategorie.</p>
      </div>
    )
  }

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1fr_160px_140px_160px_32px] gap-4 px-5 py-3 border-b border-panel-2">
        {['Unternehmen', 'Ansprechpartner', 'Branche', 'Kontakt', ''].map((h, i) => (
          <span key={i} className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">{h}</span>
        ))}
      </div>

      <ul>
        {leads.map((lead, i) => {
          const sc = STATUS_COLORS[lead.status]
          const contact = lead.phone || lead.email || lead.email_general
          return (
            <li
              key={lead.id}
              onClick={() => onLeadClick(lead)}
              className={`grid grid-cols-[1fr_32px] md:grid-cols-[1fr_160px_140px_160px_32px] gap-4 items-center px-5 py-3.5 cursor-pointer hover:bg-panel-hover transition-colors group ${
                i < leads.length - 1 ? 'border-b border-panel-2' : ''
              }`}
            >
              {/* Company */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                <p className="text-xs text-gray-600 truncate mt-0.5">
                  {lead.city || lead.region || '—'}
                </p>
              </div>

              {/* CEO */}
              <div className="hidden md:block min-w-0">
                <p className="text-sm text-gray-400 truncate">{lead.ceos || lead.owner || '—'}</p>
              </div>

              {/* Branche badge */}
              <div className="hidden md:block min-w-0">
                {lead.branche || lead.industry ? (
                  <span className="text-[10px] font-semibold bg-panel-hover text-gray-400 px-2 py-1 rounded-lg">
                    {lead.branche || lead.industry}
                  </span>
                ) : (
                  <span className="text-gray-700 text-xs">—</span>
                )}
              </div>

              {/* Contact */}
              <div className="hidden md:flex items-center gap-2 min-w-0">
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-colors truncate"
                  >
                    <Phone size={11} className="shrink-0" />
                    <span className="truncate">{lead.phone}</span>
                  </a>
                ) : lead.email || lead.email_general ? (
                  <a
                    href={`mailto:${lead.email || lead.email_general}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-colors truncate"
                  >
                    <Mail size={11} className="shrink-0" />
                    <span className="truncate">{lead.email || lead.email_general}</span>
                  </a>
                ) : (
                  <span className="text-gray-700 text-xs">—</span>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-end">
                <ChevronRight size={15} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
