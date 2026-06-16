'use client'

import { useState, useMemo } from 'react'
import { Lead, LeadStatus } from '@/lib/types'
import { STATUSES } from '@/lib/constants'
import { PipelineTabs } from './PipelineTabs'
import { LeadTable } from './LeadTable'
import { LeadDetailModal } from './LeadDetailModal'
import { NewLeadModal } from './NewLeadModal'
import { Search, Plus } from 'lucide-react'

export function LeadsView({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads]             = useState<Lead[]>(initialLeads)
  const [activeStatus, setActiveStatus] = useState<LeadStatus>('NEU')
  const [search, setSearch]           = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showNew, setShowNew]         = useState(false)

  const counts = useMemo(() =>
    STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = leads.filter(l => l.status === s).length
      return acc
    }, {}),
  [leads])

  const filtered = useMemo(() =>
    leads.filter(l => {
      if (l.status !== activeStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          l.name?.toLowerCase().includes(q) ||
          l.ceos?.toLowerCase().includes(q) ||
          l.region?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.branche?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
        )
      }
      return true
    }),
  [leads, activeStatus, search])

  async function handleUpdate(id: string, updates: Partial<Lead>) {
    const res = await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates, status_date: updates.status ? new Date().toISOString() : undefined }),
    })
    if (res.ok) {
      const { lead } = await res.json()
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...lead } : l))
      if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, ...lead } : prev)
    }
  }

  function handleCreate(lead: Lead) {
    setLeads(prev => [lead, ...prev])
    setActiveStatus(lead.status)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLeads(prev => prev.filter(l => l.id !== id))
      setSelectedLead(null)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Leads</h1>
          <p className="text-sm text-white/30 mt-2 font-medium">{leads.length} Einträge gesamt</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Neuer Lead</span>
        </button>
      </div>

      {/* Pipeline tabs */}
      <PipelineTabs
        activeStatus={activeStatus}
        counts={counts}
        onStatusChange={setActiveStatus}
      />

      {/* Search */}
      <div className="mt-4 mb-4 flex gap-3">
        <div className="relative max-w-sm w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full bg-panel border border-rim-subtle rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-rim transition-colors"
          />
        </div>
        <div className="flex items-center text-xs text-gray-600">
          {filtered.length} {filtered.length === 1 ? 'Lead' : 'Leads'}
        </div>
      </div>

      {/* Table */}
      <LeadTable leads={filtered} onLeadClick={setSelectedLead} />

      {/* Detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {/* New lead modal */}
      {showNew && (
        <NewLeadModal
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
