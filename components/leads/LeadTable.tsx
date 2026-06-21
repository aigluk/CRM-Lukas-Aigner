'use client'

import { useState, useEffect } from 'react'
import { Lead } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { Phone, ChevronRight, Share2, StickyNote, User } from 'lucide-react'

export type TeamUser = { id: string; username: string }

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

function buildContactText(lead: Lead): string {
  const lines: string[] = [lead.name]
  if (lead.ceos || lead.owner) lines.push(`Ansprechperson: ${lead.ceos || lead.owner}`)
  if (lead.phone)               lines.push(`Tel: ${lead.phone}`)
  if (lead.email || lead.email_general) lines.push(`E-Mail: ${lead.email || lead.email_general}`)
  if (lead.website)             lines.push(`Website: ${lead.website}`)
  const addr = [lead.address, lead.city || lead.region].filter(Boolean).join(', ')
  if (addr)                     lines.push(`Adresse: ${addr}`)
  return lines.join('\n')
}

function handleShare(lead: Lead, e: React.MouseEvent) {
  e.stopPropagation()
  const text = buildContactText(lead)

  // Mobile: native share sheet (user picks any app / WhatsApp contact)
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  )
  if (isMobile && navigator.share) {
    navigator.share({ title: lead.name, text }).catch(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    })
    return
  }

  // Desktop: open WhatsApp web with contact text pre-filled; user picks recipient
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

function Circle({
  selected, partial, onClick, onAccent,
}: { selected: boolean; partial?: boolean; onClick: (e: React.MouseEvent) => void; onAccent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-5 h-5 rounded-full shrink-0 transition-all ${
        selected ? (onAccent ? 'bg-white' : 'bg-accent') :
        partial  ? (onAccent ? 'bg-white/70' : 'bg-accent/45') :
        onAccent ? 'border-2 border-white/55 hover:border-white/85' :
                   'bg-white/10 hover:bg-white/20'
      }`}
    />
  )
}

// Mobile: circle | company | phone | share | chevron  (5 cols)
// SM:     circle | company | status+handler (auto) | phone | share | note | chevron  (7 cols)
const ROW_GRID = 'grid grid-cols-[36px_1fr_32px_32px_16px] sm:grid-cols-[36px_1fr_auto_32px_32px_32px_16px] gap-3 items-center px-4 sm:px-5 min-h-16'

export function LeadTableHeader({
  allSelected, someSelected, onToggleAll,
}: { allSelected: boolean; someSelected: boolean; onToggleAll: () => void }) {
  return (
    <div className={`${ROW_GRID} bg-accent rounded-t-2xl shrink-0`}>
      <Circle selected={allSelected} partial={someSelected} onAccent onClick={e => { e.stopPropagation(); onToggleAll() }} />
      <span className="text-sm font-bold text-white">Unternehmen</span>
      <span className="hidden sm:block text-xs font-bold text-white/70">Status / Bearbeiter</span>
      <span /><span /><span /><span />
    </div>
  )
}

export function LeadTable({
  leads,
  onLeadClick,
  selectedIds,
  onToggleSelect,
  currentUsername,
  users = [],
  onQuickNote,
  onSetHandler,
  onSelectRange,
}: {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  currentUsername?: string
  users?: TeamUser[]
  onQuickNote?: (lead: Lead) => void
  onSetHandler?: (id: string, newHandler: string | null) => void
  onSelectRange?: (ids: string[]) => void
}) {
  const [openHandlerFor, setOpenHandlerFor] = useState<string | null>(null)
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  // Close dropdown on any outside click
  useEffect(() => {
    if (!openHandlerFor) return
    const close = () => setOpenHandlerFor(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openHandlerFor])

  if (leads.length === 0) {
    return (
      <div className="bg-panel rounded-b-2xl py-16 text-center flex-1 min-h-0">
        <p className="text-white/40 text-sm font-medium">Keine Leads in dieser Kategorie.</p>
      </div>
    )
  }

  const rowGrid = ROW_GRID

  return (
    <div className="bg-panel rounded-b-2xl overflow-y-auto flex-1 min-h-0">
      <ul>
        {leads.map((lead, i) => {
          const selected = selectedIds.has(lead.id)
          const sc = STATUS_COLORS[lead.status]
          const phone = lead.phone?.trim()
          const canShare = !!(phone || lead.email || lead.email_general)
          const hasNotes = !!(lead.notes?.trim())

          return (
            <li
              key={lead.id}
              className={`${rowGrid} ${i === 0 ? 'pt-4 pb-3' : 'py-3'} transition-colors cursor-pointer group ${
                i < leads.length - 1 ? 'border-b border-panel-2' : ''
              } ${selected ? 'bg-accent/7' : openHandlerFor === lead.id ? '' : 'hover:bg-panel-hover'}`}
            >
              {/* Circle selector — shift+click selects range */}
              <Circle
                selected={selected}
                onClick={e => {
                  e.stopPropagation()
                  if (e.shiftKey && lastSelectedId && onSelectRange) {
                    const lastIdx = leads.findIndex(l => l.id === lastSelectedId)
                    if (lastIdx !== -1) {
                      const lo = Math.min(lastIdx, i)
                      const hi = Math.max(lastIdx, i)
                      onSelectRange(leads.slice(lo, hi + 1).map(l => l.id))
                      setLastSelectedId(lead.id)
                      return
                    }
                  }
                  onToggleSelect(lead.id)
                  setLastSelectedId(lead.id)
                }}
              />

              {/* Company + person / city */}
              <div className="min-w-0" onClick={() => onLeadClick(lead)}>
                <p className="text-sm font-semibold text-white truncate leading-snug">{lead.name}</p>
                <p className="text-xs text-white/35 truncate mt-0.5 leading-snug">
                  {[lead.ceos || lead.owner, lead.city || lead.region].filter(Boolean).join(' · ') || '-'}
                </p>
              </div>

              {/* Status + Handler pill — SM only */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Status */}
                <span
                  onClick={() => onLeadClick(lead)}
                  className={`h-8 inline-flex items-center px-3 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${sc.bg} ${sc.text}`}
                >
                  {STATUS_LABELS[lead.status]}
                </span>

                {/* Handler pill with user selector */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenHandlerFor(openHandlerFor === lead.id ? null : lead.id)}
                    title={lead.handler ? `Bearbeiter: ${lead.handler}` : 'Bearbeiter zuweisen'}
                    className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap max-w-27.5 ${
                      lead.handler
                        ? lead.handler === currentUsername
                          ? 'bg-accent/20 text-accent hover:bg-accent/30'
                          : 'bg-white/12 text-white/70 hover:bg-white/18'
                        : 'bg-white/5 text-white/25 hover:bg-white/10 hover:text-white/40'
                    }`}
                  >
                    <User size={10} className="shrink-0" />
                    <span className="truncate">{lead.handler || '-'}</span>
                  </button>

                  {openHandlerFor === lead.id && (
                    <div className="absolute top-full left-0 mt-1 z-200 bg-panel-hover rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 p-1 min-w-37.5">
                      {users.length === 0 && (
                        <p className="px-3 py-2.5 text-xs text-white/30">Erst Benutzernamen in Einstellungen setzen.</p>
                      )}
                      {users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => { onSetHandler?.(lead.id, lead.handler === u.username ? null : u.username); setOpenHandlerFor(null) }}
                          className={`w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-white/8 transition-colors flex items-center gap-2 ${
                            lead.handler === u.username ? 'text-accent font-bold' : 'text-white/60'
                          }`}
                        >
                          <User size={11} className="shrink-0 opacity-40" />
                          {u.username}
                        </button>
                      ))}
                      {lead.handler && (
                        <button
                          onClick={() => { onSetHandler?.(lead.id, null); setOpenHandlerFor(null) }}
                          className="w-full text-left px-3 py-2 mt-0.5 text-xs text-white/30 hover:bg-white/8 hover:text-accent transition-colors border-t border-white/8 rounded-b-lg"
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

              {/* Share → WhatsApp */}
              <div className="flex items-center justify-center">
                {canShare ? (
                  <button
                    onClick={e => handleShare(lead, e)}
                    title="WhatsApp / Kontakt teilen"
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
