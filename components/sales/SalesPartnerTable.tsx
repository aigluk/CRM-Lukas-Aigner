'use client'

import type { AccountingSalesPartner } from '@/lib/types'
import { Phone, ChevronRight, Share2 } from 'lucide-react'

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

function handleShare(s: AccountingSalesPartner, e: React.MouseEvent) {
  e.stopPropagation()
  const lines = [s.name]
  if (s.contact_person) lines.push(`Ansprechperson: ${s.contact_person}`)
  if (s.phone) lines.push(`Tel: ${s.phone}`)
  if (s.email) lines.push(`E-Mail: ${s.email}`)
  if (s.website) lines.push(`Website: ${s.website}`)
  if (s.address) lines.push(`Adresse: ${s.address}`)
  const text = lines.join('\n')

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  )
  if (isMobile && navigator.share) {
    navigator.share({ title: s.name, text }).catch(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    })
    return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

const ROW_GRID = 'grid grid-cols-[36px_1fr_32px_32px_16px] gap-3 items-center px-4 sm:px-5 min-h-16'

export function SalesPartnerTableHeader({
  allSelected, someSelected, onToggleAll,
}: { allSelected: boolean; someSelected: boolean; onToggleAll: () => void }) {
  return (
    <div className={`${ROW_GRID} bg-accent rounded-t-2xl shrink-0`}>
      <Circle selected={allSelected} partial={someSelected} onAccent onClick={e => { e.stopPropagation(); onToggleAll() }} />
      <span className="text-sm font-bold text-white">Vertriebspartner &amp; Handelsagenten</span>
      <span /><span /><span />
    </div>
  )
}

export function SalesPartnerTable({
  salesPartners,
  onSalesPartnerClick,
  selectedIds,
  onToggleSelect,
}: {
  salesPartners: AccountingSalesPartner[]
  onSalesPartnerClick: (s: AccountingSalesPartner) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}) {
  if (salesPartners.length === 0) {
    return (
      <div className="bg-panel rounded-b-2xl py-16 text-center flex-1 min-h-0">
        <p className="text-white/40 text-sm font-medium">Noch keine Vertriebspartner angelegt.</p>
      </div>
    )
  }

  return (
    <div className="bg-panel rounded-b-2xl overflow-y-auto flex-1 min-h-0">
      <ul>
        {salesPartners.map((s, i) => {
          const selected = selectedIds.has(s.id)
          const phone = s.phone?.trim()
          const canShare = !!(phone || s.email)

          return (
            <li
              key={s.id}
              className={`${ROW_GRID} ${i === 0 ? 'pt-4 pb-3' : 'py-3'} transition-colors cursor-pointer group ${
                i < salesPartners.length - 1 ? 'border-b border-panel-2' : ''
              } ${selected ? 'bg-accent/7' : 'hover:bg-panel-hover'}`}
              onClick={() => onSalesPartnerClick(s)}
            >
              <Circle
                selected={selected}
                onClick={e => { e.stopPropagation(); onToggleSelect(s.id) }}
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-snug">{s.name}</p>
                <p className="text-xs text-white/35 truncate mt-0.5 leading-snug">
                  {[s.address?.split('\n')[0], s.country, s.email].filter(Boolean).join(' · ') || '-'}
                </p>
              </div>

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

              <div className="flex items-center justify-center">
                {canShare ? (
                  <button
                    onClick={e => handleShare(s, e)}
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

              <div className="flex justify-end">
                <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
