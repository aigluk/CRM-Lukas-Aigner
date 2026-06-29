'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Trash2, X } from 'lucide-react'
import type { AccountingCustomer } from '@/lib/types'
import { CustomerModal } from '@/components/accounting/CustomerModal'
import { CustomerTable, CustomerTableHeader } from './CustomerTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function CustomersView() {
  const [customers, setCustomers] = useState<AccountingCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ customer?: AccountingCustomer } | null>(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/accounting/customers').then(r => r.json())
      setCustomers(res.customers ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Deep link from dashboard reminders: ?openCustomer=<id>
  useEffect(() => {
    if (loading) return
    const params = new URLSearchParams(window.location.search)
    const openId = params.get('openCustomer')
    if (openId) {
      const customer = customers.find(c => c.id === openId)
      if (customer) setModal({ customer })
      const url = new URL(window.location.href)
      url.searchParams.delete('openCustomer')
      window.history.replaceState({}, '', url.toString())
    }
  }, [loading, customers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.contact_person?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    )
  }, [customers, search])

  const allSelected  = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))
  const someSelected = filtered.some(c => selectedIds.has(c.id)) && !allSelected
  const selectionCount = filtered.filter(c => selectedIds.has(c.id)).length

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function toggleAll() {
    const allFilteredIds = filtered.map(c => c.id)
    const allSel = allFilteredIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (allSel) allFilteredIds.forEach(id => n.delete(id))
      else allFilteredIds.forEach(id => n.add(id))
      return n
    })
  }

  function handleBulkDelete() {
    if (!selectedIds.size || deleting) return
    setConfirmBulkDelete(true)
  }

  async function confirmBulkDeleteNow() {
    setDeleting(true)
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/accounting/customers?id=${id}`, { method: 'DELETE' })
      ))
      setCustomers(prev => prev.filter(c => !selectedIds.has(c.id)))
      setSelectedIds(new Set())
    } finally {
      setDeleting(false)
      setConfirmBulkDelete(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none">Kunden</h1>
            <p className="text-sm text-white/30 mt-2 font-medium">{customers.length} Einträge gesamt</p>
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          >
            <Plus size={16} /><span className="hidden sm:inline">Neuer Kunde</span>
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
              {filtered.length} {filtered.length === 1 ? 'Kunde' : 'Kunden'}
            </div>
          )}
        </div>

      </div>

      {loading ? (
        <p className="text-sm text-white/30 text-center py-16 font-medium">Lädt…</p>
      ) : (
        <div className="mt-5 flex-1 min-h-0 flex flex-col">
          <CustomerTableHeader allSelected={allSelected} someSelected={someSelected} onToggleAll={toggleAll} />
          <CustomerTable
            customers={filtered}
            onCustomerClick={c => setModal({ customer: c })}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </div>
      )}

      {modal && (
        <CustomerModal
          customer={modal.customer}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {confirmBulkDelete && (
        <ConfirmDialog
          message={`${selectedIds.size} Kunde(n) wirklich löschen?`}
          onConfirm={confirmBulkDeleteNow}
          onClose={() => setConfirmBulkDelete(false)}
        />
      )}
    </div>
  )
}
