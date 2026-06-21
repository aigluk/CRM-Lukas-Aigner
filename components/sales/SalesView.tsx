'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Trash2, X } from 'lucide-react'
import type { AccountingSalesPartner } from '@/lib/types'
import { SalesPartnerModal } from '@/components/accounting/SalesPartnerModal'
import { SalesPartnerTable, SalesPartnerTableHeader } from './SalesPartnerTable'

export function SalesView() {
  const [salesPartners, setSalesPartners] = useState<AccountingSalesPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ salesPartner?: AccountingSalesPartner } | null>(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/accounting/sales-partners').then(r => r.json())
      setSalesPartners(res.salesPartners ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Deep link from dashboard reminders: ?openSalesPartner=<id>
  useEffect(() => {
    if (loading) return
    const params = new URLSearchParams(window.location.search)
    const openId = params.get('openSalesPartner')
    if (openId) {
      const sp = salesPartners.find(s => s.id === openId)
      if (sp) setModal({ salesPartner: sp })
      const url = new URL(window.location.href)
      url.searchParams.delete('openSalesPartner')
      window.history.replaceState({}, '', url.toString())
    }
  }, [loading, salesPartners])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return salesPartners
    return salesPartners.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.contact_person?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.country?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    )
  }, [salesPartners, search])

  const allSelected  = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id))
  const someSelected = filtered.some(s => selectedIds.has(s.id)) && !allSelected
  const selectionCount = filtered.filter(s => selectedIds.has(s.id)).length

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function toggleAll() {
    const allFilteredIds = filtered.map(s => s.id)
    const allSel = allFilteredIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (allSel) allFilteredIds.forEach(id => n.delete(id))
      else allFilteredIds.forEach(id => n.add(id))
      return n
    })
  }

  async function handleBulkDelete() {
    if (!selectedIds.size || deleting) return
    if (!confirm(`${selectedIds.size} Vertriebspartner wirklich löschen?`)) return
    setDeleting(true)
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/accounting/sales-partners?id=${id}`, { method: 'DELETE' })
      ))
      setSalesPartners(prev => prev.filter(s => !selectedIds.has(s.id)))
      setSelectedIds(new Set())
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none">Vertrieb</h1>
            <p className="text-sm text-white/30 mt-2 font-medium">{salesPartners.length} Einträge gesamt</p>
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          >
            <Plus size={16} /><span className="hidden sm:inline">Neuer Vertriebspartner</span>
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full bg-panel rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {selectionCount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-medium">{selectionCount} ausgewählt</span>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                <Trash2 size={13} />
                {deleting ? 'Löschen…' : `${selectionCount} löschen`}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-white/30 hover:text-white rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center text-xs text-white/35 font-medium shrink-0">
              {filtered.length} {filtered.length === 1 ? 'Vertriebspartner' : 'Vertriebspartner'}
            </div>
          )}
        </div>

      </div>

      {loading ? (
        <p className="text-sm text-white/30 text-center py-16 font-medium">Lädt…</p>
      ) : salesPartners.length === 0 ? (
        <div className="bg-panel rounded-2xl py-16 text-center">
          <p className="text-white/40 text-sm font-medium">Noch keine Vertriebspartner angelegt.</p>
        </div>
      ) : (
        <div className="mt-5 flex-1 min-h-0 flex flex-col">
          <SalesPartnerTableHeader allSelected={allSelected} someSelected={someSelected} onToggleAll={toggleAll} />
          <SalesPartnerTable
            salesPartners={filtered}
            onSalesPartnerClick={s => setModal({ salesPartner: s })}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </div>
      )}

      {modal && (
        <SalesPartnerModal
          salesPartner={modal.salesPartner}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
