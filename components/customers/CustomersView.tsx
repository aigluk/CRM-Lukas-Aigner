'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { AccountingCustomer } from '@/lib/types'
import { CustomerModal } from '@/components/accounting/CustomerModal'

export function CustomersView() {
  const [customers, setCustomers] = useState<AccountingCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ customer?: AccountingCustomer } | null>(null)

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

  async function deleteCustomer(id: string) {
    if (!confirm('Kunde wirklich löschen?')) return
    setCustomers(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/accounting/customers?id=${id}`, { method: 'DELETE' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Kunden</h1>
          <p className="text-sm text-white/30 mt-2 font-medium">Kundenstamm & Stammdaten</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
        >
          <Plus size={16} /><span className="hidden sm:inline">Neuer Kunde</span>
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-white/30 text-center py-16 font-medium">Lädt…</p>
      ) : customers.length === 0 ? (
        <div className="bg-panel rounded-2xl py-16 text-center">
          <p className="text-white/40 text-sm font-medium">Noch keine Kunden angelegt.</p>
        </div>
      ) : (
        <div className="bg-panel rounded-2xl overflow-hidden">
          <ul>
            {customers.map((c, i) => (
              <li key={c.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < customers.length - 1 ? 'border-b border-panel-2' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="text-xs text-white/35 mt-0.5 truncate">
                    {[c.address?.split('\n')[0], c.country, c.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <button
                  onClick={() => setModal({ customer: c })}
                  title="Bearbeiten"
                  className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteCustomer(c.id)}
                  title="Löschen"
                  className="w-8 h-8 rounded-full bg-white/6 hover:bg-accent/20 flex items-center justify-center text-white/30 hover:text-accent transition-all shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal && (
        <CustomerModal
          customer={modal.customer}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
