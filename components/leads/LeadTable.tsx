'use client'

import { Lead } from '@/lib/types'
import { STATUS_COLORS } from '@/lib/constants'
import { Phone, Mail, ChevronRight, Check } from 'lucide-react'

export function LeadTable({
  leads,
  onLeadClick,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
}) {
  const allSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id))
  const someSelected = leads.some(l => selectedIds.has(l.id))

  if (leads.length === 0) {
    return (
      <div className="bg-panel rounded-2xl py-16 text-center">
        <p className="text-white/40 text-sm font-medium">Keine Leads in dieser Kategorie.</p>
      </div>
    )
  }

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[40px_1fr_160px_140px_160px_32px] gap-4 px-5 py-3 border-b border-panel-2">
        {/* Select all checkbox */}
        <div className="flex items-center">
          <button
            onClick={onToggleAll}
            className={`w-4.5 h-4.5 rounded flex items-center justify-center transition-all border ${
              allSelected
                ? 'bg-accent border-accent'
                : someSelected
                ? 'bg-accent/40 border-accent/60'
                : 'border-white/15 hover:border-white/35'
            }`}
          >
            {(allSelected || someSelected) && <Check size={10} className="text-white" strokeWidth={3} />}
          </button>
        </div>
        {['Unternehmen', 'Ansprechpartner', 'Branche', 'Kontakt', ''].map((h, i) => (
          <span key={i} className="text-[10px] font-bold text-white/25 uppercase tracking-widest flex items-center">{h}</span>
        ))}
      </div>

      <ul>
        {leads.map((lead, i) => {
          const selected = selectedIds.has(lead.id)
          const contact = lead.phone || lead.email || lead.email_general
          return (
            <li
              key={lead.id}
              className={`grid grid-cols-[40px_1fr_32px] md:grid-cols-[40px_1fr_160px_140px_160px_32px] gap-4 items-center px-5 py-3.5 transition-colors group ${
                i < leads.length - 1 ? 'border-b border-panel-2' : ''
              } ${selected ? 'bg-accent/8' : 'hover:bg-panel-hover'}`}
            >
              {/* Checkbox */}
              <div className="flex items-center" onClick={e => { e.stopPropagation(); onToggleSelect(lead.id) }}>
                <button
                  className={`w-4.5 h-4.5 rounded flex items-center justify-center transition-all border shrink-0 ${
                    selected ? 'bg-accent border-accent' : 'border-white/15 hover:border-accent/60'
                  }`}
                >
                  {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
              </div>

              {/* Company — clicking the row opens detail */}
              <div className="min-w-0 cursor-pointer" onClick={() => onLeadClick(lead)}>
                <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                <p className="text-xs text-white/35 truncate mt-0.5">
                  {lead.city || lead.region || '—'}
                </p>
              </div>

              {/* CEO */}
              <div className="hidden md:block min-w-0 cursor-pointer" onClick={() => onLeadClick(lead)}>
                <p className="text-sm text-white/50 truncate">{lead.ceos || lead.owner || '—'}</p>
              </div>

              {/* Branche badge */}
              <div className="hidden md:block min-w-0 cursor-pointer" onClick={() => onLeadClick(lead)}>
                {lead.branche || lead.industry ? (
                  <span className="text-[10px] font-semibold bg-panel-hover text-white/50 px-2 py-1 rounded-lg">
                    {lead.branche || lead.industry}
                  </span>
                ) : (
                  <span className="text-white/20 text-xs">—</span>
                )}
              </div>

              {/* Contact */}
              <div className="hidden md:flex items-center gap-2 min-w-0">
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-accent transition-colors truncate"
                  >
                    <Phone size={11} className="shrink-0" />
                    <span className="truncate">{lead.phone}</span>
                  </a>
                ) : lead.email || lead.email_general ? (
                  <a
                    href={`mailto:${lead.email || lead.email_general}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-accent transition-colors truncate"
                  >
                    <Mail size={11} className="shrink-0" />
                    <span className="truncate">{lead.email || lead.email_general}</span>
                  </a>
                ) : (
                  <span className="text-white/20 text-xs">—</span>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-end cursor-pointer" onClick={() => onLeadClick(lead)}>
                <ChevronRight size={15} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
