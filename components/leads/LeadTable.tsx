'use client'

import { Lead } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { Phone, ChevronRight, Share2 } from 'lucide-react'

function buildVCard(lead: Lead): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${lead.ceos || lead.name}`,
    `ORG:${lead.name}`,
    lead.phone      ? `TEL;TYPE=CELL:${lead.phone}` : '',
    (lead.email || lead.email_general) ? `EMAIL:${lead.email || lead.email_general}` : '',
    lead.website    ? `URL:${lead.website}` : '',
    lead.city || lead.region ? `ADR:;;${lead.city || lead.region};;;;` : '',
    'END:VCARD',
  ]
  return lines.filter(Boolean).join('\n')
}

function shareContact(lead: Lead, e: React.MouseEvent) {
  e.stopPropagation()
  const vcard = buildVCard(lead)

  if (navigator.share) {
    const blob = new Blob([vcard], { type: 'text/vcard' })
    const file = new File([blob], `${lead.name.replace(/[^a-z0-9]/gi, '_')}.vcf`, { type: 'text/vcard' })
    navigator.share({ files: [file], title: lead.name }).catch(() => {})
    return
  }

  // Fallback: WhatsApp if phone, email otherwise
  const phone = lead.phone?.replace(/[\s\-\(\)\/]/g, '')
  if (phone) {
    const digits = phone.replace(/[^0-9+]/g, '').replace(/^\+?43/, '43').replace(/^0/, '43')
    window.open(`https://wa.me/${digits}`, '_blank')
  } else if (lead.email || lead.email_general) {
    window.location.href = `mailto:${lead.email || lead.email_general}?subject=${encodeURIComponent(lead.name)}`
  }
}

// Solid circle — no border, just fill change
function Circle({
  selected, partial, onClick,
}: { selected: boolean; partial?: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-5 h-5 rounded-full shrink-0 transition-all ${
        selected
          ? 'bg-accent shadow-sm'
          : partial
          ? 'bg-accent/45'
          : 'bg-white/10 hover:bg-white/20'
      }`}
    />
  )
}

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
  const allSelected  = leads.length > 0 && leads.every(l => selectedIds.has(l.id))
  const someSelected = leads.some(l => selectedIds.has(l.id)) && !allSelected

  if (leads.length === 0) {
    return (
      <div className="bg-panel rounded-2xl py-16 text-center">
        <p className="text-white/40 text-sm font-medium">Keine Leads in dieser Kategorie.</p>
      </div>
    )
  }

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[44px_1fr_auto_36px_36px_20px] gap-3 px-5 py-3 border-b border-panel-2 items-center">
        <Circle
          selected={allSelected}
          partial={someSelected}
          onClick={e => { e.stopPropagation(); onToggleAll() }}
        />
        <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Unternehmen</span>
        <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest hidden sm:block">Status</span>
        <span />
        <span />
        <span />
      </div>

      <ul>
        {leads.map((lead, i) => {
          const selected = selectedIds.has(lead.id)
          const sc       = STATUS_COLORS[lead.status]
          const phone    = lead.phone
          const canShare = !!(phone || lead.email || lead.email_general)

          return (
            <li
              key={lead.id}
              className={`grid grid-cols-[44px_1fr_auto_36px_36px_20px] gap-3 items-center px-5 py-3.5 transition-colors cursor-pointer group ${
                i < leads.length - 1 ? 'border-b border-panel-2' : ''
              } ${selected ? 'bg-accent/7' : 'hover:bg-panel-hover'}`}
            >
              {/* Circle selector */}
              <Circle
                selected={selected}
                onClick={e => { e.stopPropagation(); onToggleSelect(lead.id) }}
              />

              {/* Company info */}
              <div className="min-w-0" onClick={() => onLeadClick(lead)}>
                <p className="text-sm font-semibold text-white truncate leading-snug">{lead.name}</p>
                <p className="text-xs text-white/35 truncate mt-0.5 leading-snug">
                  {[lead.ceos || lead.owner, lead.city || lead.region].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>

              {/* Status badge */}
              <div className="hidden sm:flex items-center" onClick={() => onLeadClick(lead)}>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${sc.bg} ${sc.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {STATUS_LABELS[lead.status]}
                </span>
              </div>

              {/* Call button — red circle */}
              <div className="flex items-center justify-center">
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    onClick={e => e.stopPropagation()}
                    title={phone}
                    className="w-8 h-8 rounded-full bg-accent flex items-center justify-center hover:bg-accent-hover transition-all active:scale-90 shadow-sm"
                  >
                    <Phone size={13} className="text-white" strokeWidth={2.5} />
                  </a>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Phone size={13} className="text-white/15" strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Share button — green circle */}
              <div className="flex items-center justify-center">
                {canShare ? (
                  <button
                    onClick={e => shareContact(lead, e)}
                    title="Kontakt teilen"
                    className="w-8 h-8 rounded-full bg-accent-green/80 flex items-center justify-center hover:bg-accent-green transition-all active:scale-90 shadow-sm"
                  >
                    <Share2 size={12} className="text-dark" strokeWidth={2.5} />
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Share2 size={12} className="text-white/15" strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Chevron */}
              <div className="flex justify-end" onClick={() => onLeadClick(lead)}>
                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
