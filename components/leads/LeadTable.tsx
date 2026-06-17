'use client'

import { Lead } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { Phone, ChevronRight, Share2 } from 'lucide-react'

// Normalise any Austrian phone number to international digits for wa.me
function toWaPhone(raw: string): string {
  return raw
    .replace(/\(0\)/g, '')       // +43 (0) 5 → +43 5
    .replace(/[^0-9+]/g, '')     // keep only digits and +
    .replace(/^\+/, '')          // strip leading +
    .replace(/^0043/, '43')      // 0043… → 43…
    .replace(/^00/, '43')        // 00… → 43…
    .replace(/^0/, '43')         // 0… → 43… (domestic prefix)
}

function buildVCard(lead: Lead): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${lead.ceos || lead.name}`,
    `ORG:${lead.name}`,
    lead.phone ? `TEL;TYPE=CELL:${lead.phone}` : '',
    (lead.email || lead.email_general) ? `EMAIL:${lead.email || lead.email_general}` : '',
    lead.website ? `URL:${lead.website}` : '',
    (lead.city || lead.region) ? `ADR:;;${lead.city || lead.region};;;;` : '',
    'END:VCARD',
  ].filter(Boolean).join('\n')
}

function handleShare(lead: Lead, e: React.MouseEvent) {
  e.stopPropagation()
  const phone = lead.phone?.trim()
  const email = lead.email || lead.email_general

  // Web Share API — opens native iOS/macOS share sheet with .vcf contact file
  if (navigator.share) {
    const vcard = buildVCard(lead)
    const blob  = new Blob([vcard], { type: 'text/vcard' })
    const file  = new File([blob], `${lead.name.replace(/[^a-z0-9]/gi, '_')}.vcf`, { type: 'text/vcard' })
    navigator.share({ files: [file], title: lead.name }).catch(() => {
      // If sharing files fails (some browsers), fall back to WhatsApp
      if (phone) window.open(`https://wa.me/${toWaPhone(phone)}`, '_blank')
    })
    return
  }

  // Fallback: WhatsApp deeplink if phone, otherwise mailto
  if (phone) {
    window.open(`https://wa.me/${toWaPhone(phone)}`, '_blank')
  } else if (email) {
    window.open(`mailto:${email}?subject=${encodeURIComponent(lead.name)}`, '_blank')
  }
}

function Circle({
  selected, partial, onClick,
}: { selected: boolean; partial?: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-5 h-5 rounded-full shrink-0 transition-all ${
        selected  ? 'bg-accent' :
        partial   ? 'bg-accent/45' :
                    'bg-white/10 hover:bg-white/20'
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

  // Responsive grid: mobile hides status pill, desktop shows it
  const rowGrid = 'grid grid-cols-[36px_1fr_32px_32px_16px] sm:grid-cols-[36px_1fr_auto_32px_32px_16px] gap-3 items-center px-4 sm:px-5'

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`${rowGrid} py-3 border-b border-panel-2`}>
        <Circle selected={allSelected} partial={someSelected} onClick={e => { e.stopPropagation(); onToggleAll() }} />
        <span className="text-[10px] font-bold text-white/25 tracking-wide">Unternehmen</span>
        <span className="hidden sm:block text-[10px] font-bold text-white/25 tracking-wide">Status</span>
        <span /><span /><span />
      </div>

      <ul>
        {leads.map((lead, i) => {
          const selected = selectedIds.has(lead.id)
          const sc       = STATUS_COLORS[lead.status]
          const phone    = lead.phone?.trim()
          const canShare = !!(phone || lead.email || lead.email_general)

          return (
            <li
              key={lead.id}
              className={`${rowGrid} py-3 transition-colors cursor-pointer group ${
                i < leads.length - 1 ? 'border-b border-panel-2' : ''
              } ${selected ? 'bg-accent/7' : 'hover:bg-panel-hover'}`}
            >
              {/* Circle selector */}
              <Circle selected={selected} onClick={e => { e.stopPropagation(); onToggleSelect(lead.id) }} />

              {/* Company + person / city */}
              <div className="min-w-0" onClick={() => onLeadClick(lead)}>
                <p className="text-sm font-semibold text-white truncate leading-snug">{lead.name}</p>
                <p className="text-xs text-white/35 truncate mt-0.5 leading-snug">
                  {[lead.ceos || lead.owner, lead.city || lead.region].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>

              {/* Status pill — same height as circle buttons (h-8), no dot */}
              <div className="hidden sm:flex items-center" onClick={() => onLeadClick(lead)}>
                <span className={`h-8 inline-flex items-center px-3 rounded-full text-[10px] font-bold whitespace-nowrap ${sc.bg} ${sc.text}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
              </div>

              {/* Call — red circle */}
              <div className="flex items-center justify-center">
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    onClick={e => e.stopPropagation()}
                    title={phone}
                    className="w-8 h-8 rounded-full bg-accent flex items-center justify-center hover:bg-accent-hover transition-all active:scale-90"
                  >
                    <Phone size={13} className="text-white" strokeWidth={2.5} />
                  </a>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Phone size={13} className="text-white/12" />
                  </div>
                )}
              </div>

              {/* Share — green circle */}
              <div className="flex items-center justify-center">
                {canShare ? (
                  <button
                    onClick={e => handleShare(lead, e)}
                    title="Kontakt teilen / WhatsApp"
                    className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center hover:opacity-85 transition-all active:scale-90"
                  >
                    <Share2 size={12} className="text-dark" strokeWidth={2.5} />
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Share2 size={12} className="text-white/12" />
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
