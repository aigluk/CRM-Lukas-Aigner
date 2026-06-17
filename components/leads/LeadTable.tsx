'use client'

import { Lead } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { Phone, ChevronRight, Share2, StickyNote, User } from 'lucide-react'

function toWaPhone(raw: string): string {
  return raw
    .replace(/\(0\)/g, '')
    .replace(/[^0-9+]/g, '')
    .replace(/^\+/, '')
    .replace(/^0043/, '43')
    .replace(/^00/, '43')
    .replace(/^0/, '43')
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
  if (navigator.share) {
    const vcard = buildVCard(lead)
    const blob  = new Blob([vcard], { type: 'text/vcard' })
    const file  = new File([blob], `${lead.name.replace(/[^a-z0-9]/gi, '_')}.vcf`, { type: 'text/vcard' })
    navigator.share({ files: [file], title: lead.name }).catch(() => {
      if (phone) window.open(`https://wa.me/${toWaPhone(phone)}`, '_blank')
    })
    return
  }
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
  currentUsername,
  onQuickNote,
  onSetHandler,
}: {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  currentUsername?: string
  onQuickNote?: (lead: Lead) => void
  onSetHandler?: (id: string, newHandler: string | null) => void
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

  // Mobile: circle | company | phone | share | handler | chevron  (6 cols)
  // SM:     circle | company | status | phone | share | note | handler | chevron  (8 cols)
  const rowGrid = 'grid grid-cols-[36px_1fr_32px_32px_32px_16px] sm:grid-cols-[36px_1fr_auto_32px_32px_32px_32px_16px] gap-3 items-center px-4 sm:px-5'

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`${rowGrid} py-3 border-b border-panel-2`}>
        <Circle selected={allSelected} partial={someSelected} onClick={e => { e.stopPropagation(); onToggleAll() }} />
        <span className="text-xs font-bold text-white/25">Unternehmen</span>
        <span className="hidden sm:block text-xs font-bold text-white/25">Status</span>
        <span className="hidden sm:block" />
        <span /><span /><span /><span />
      </div>

      <ul>
        {leads.map((lead, i) => {
          const selected   = selectedIds.has(lead.id)
          const sc         = STATUS_COLORS[lead.status]
          const phone      = lead.phone?.trim()
          const canShare   = !!(phone || lead.email || lead.email_general)
          const isMyLead   = !!(currentUsername && lead.handler === currentUsername)
          const hasHandler = !!lead.handler
          const hasNotes   = !!(lead.notes?.trim())

          const initials = lead.handler
            ? lead.handler.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
            : null

          function toggleHandler(e: React.MouseEvent) {
            e.stopPropagation()
            if (!onSetHandler) return
            if (!currentUsername) return
            onSetHandler(lead.id, isMyLead ? null : currentUsername)
          }

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

              {/* Status pill — SM only */}
              <div className="hidden sm:flex items-center" onClick={() => onLeadClick(lead)}>
                <span className={`h-8 inline-flex items-center px-3 rounded-full text-xs font-bold whitespace-nowrap ${sc.bg} ${sc.text}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
              </div>

              {/* Call */}
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

              {/* Share */}
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

              {/* Quick Note — SM only */}
              <div className="hidden sm:flex items-center justify-center">
                <button
                  onClick={e => { e.stopPropagation(); onQuickNote?.(lead) }}
                  title={hasNotes ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    hasNotes ? 'bg-accent/15 hover:bg-accent/25' : 'bg-white/5 hover:bg-white/12'
                  }`}
                >
                  <StickyNote size={12} className={hasNotes ? 'text-accent' : 'text-white/25'} />
                </button>
              </div>

              {/* Handler */}
              <div className="flex items-center justify-center">
                <button
                  onClick={toggleHandler}
                  title={hasHandler ? `Bearbeiter: ${lead.handler}${isMyLead ? ' (du)' : ''}` : 'Dir zuweisen'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 text-[11px] font-black leading-none ${
                    isMyLead   ? 'bg-accent text-white hover:opacity-85' :
                    hasHandler ? 'bg-white/15 text-white/60 hover:bg-white/22' :
                                 'bg-white/5 hover:bg-white/12'
                  }`}
                >
                  {initials
                    ? <span className="text-[11px] font-black">{initials}</span>
                    : <User size={12} className="text-white/25" />
                  }
                </button>
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
