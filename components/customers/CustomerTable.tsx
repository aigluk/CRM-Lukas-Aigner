'use client'

import type { AccountingCustomer } from '@/lib/types'
import { Phone, ChevronRight, Share2, Globe } from 'lucide-react'

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

function handleShare(c: AccountingCustomer, e: React.MouseEvent) {
  e.stopPropagation()
  const lines = [c.name]
  if (c.contact_person) lines.push(`Ansprechperson: ${c.contact_person}`)
  if (c.phone) lines.push(`Tel: ${c.phone}`)
  if (c.email) lines.push(`E-Mail: ${c.email}`)
  if (c.website) lines.push(`Website: ${c.website}`)
  if (c.address) lines.push(`Adresse: ${c.address}`)
  const text = lines.join('\n')

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  )
  if (isMobile && navigator.share) {
    navigator.share({ title: c.name, text }).catch(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    })
    return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

const ROW_GRID = 'grid grid-cols-[36px_1fr_32px_32px_32px_16px] gap-3 items-center px-4 sm:px-5 min-h-16'

export function CustomerTableHeader({
  allSelected, someSelected, onToggleAll,
}: { allSelected: boolean; someSelected: boolean; onToggleAll: () => void }) {
  return (
    <div className={`${ROW_GRID} bg-accent rounded-t-2xl shrink-0`}>
      <Circle selected={allSelected} partial={someSelected} onAccent onClick={e => { e.stopPropagation(); onToggleAll() }} />
      <span className="text-sm font-bold text-white">Kundenstamm &amp; Stammdaten</span>
      <span /><span /><span /><span />
    </div>
  )
}

export function CustomerTable({
  customers,
  onCustomerClick,
  selectedIds,
  onToggleSelect,
  onSelectRange,
}: {
  customers: AccountingCustomer[]
  onCustomerClick: (c: AccountingCustomer) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectRange?: (ids: string[]) => void
}) {
  if (customers.length === 0) {
    return (
      <div className="bg-panel rounded-b-2xl py-16 text-center flex-1 min-h-0">
        <p className="text-white/40 text-sm font-medium">Noch keine Kunden angelegt.</p>
      </div>
    )
  }

  return (
    <div className="bg-panel rounded-b-2xl overflow-y-auto flex-1 min-h-0">
      <ul>
        {customers.map((c, i) => {
          const selected = selectedIds.has(c.id)
          const phone = c.phone?.trim()
          const canShare = !!(phone || c.email)

          return (
            <li
              key={c.id}
              className={`${ROW_GRID} ${i === 0 ? 'pt-4 pb-3' : 'py-3'} transition-colors cursor-pointer group ${
                i < customers.length - 1 ? 'border-b border-panel-2' : ''
              } ${selected ? 'bg-accent/7' : 'hover:bg-panel-hover'}`}
              onClick={() => onCustomerClick(c)}
            >
              <Circle
                selected={selected}
                onClick={e => { e.stopPropagation(); onToggleSelect(c.id) }}
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-snug">{c.name}</p>
                <p className="text-xs text-white/35 truncate mt-0.5 leading-snug">
                  {[c.address?.split('\n')[0], c.country, c.email].filter(Boolean).join(' · ') || '-'}
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
                    onClick={e => handleShare(c, e)}
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

              <div className="flex items-center justify-center">
                {c.website ? (
                  <a
                    href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title={c.website}
                    className="w-8 h-8 rounded-full bg-white/12 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                  >
                    <Globe size={13} className="text-white" strokeWidth={2.5} />
                  </a>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Globe size={13} className="text-white/12" />
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
