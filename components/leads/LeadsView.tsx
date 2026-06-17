'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Lead, LeadStatus } from '@/lib/types'
import { STATUSES } from '@/lib/constants'
import { PipelineTabs } from './PipelineTabs'
import { LeadTable } from './LeadTable'
import { LeadDetailModal } from './LeadDetailModal'
import { NewLeadModal } from './NewLeadModal'
import { QuickNoteModal } from './QuickNoteModal'
import { Search, Plus, Upload, Trash2, X } from 'lucide-react'
import { ImportModal } from './ImportModal'
import { createClient } from '@/lib/supabase/client'

export function LeadsView({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads]             = useState<Lead[]>(initialLeads)
  const [activeStatus, setActiveStatus] = useState<LeadStatus>('NEU')
  const [search, setSearch]           = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showNew, setShowNew]         = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting]       = useState(false)
  const [quickNoteLead, setQuickNoteLead] = useState<Lead | null>(null)
  const [currentUsername, setCurrentUsername] = useState('')
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // Fetch current username + subscribe to realtime
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return

      setCurrentUsername(user.user_metadata?.display_name || '')

      // Realtime: reflect changes made by any team member immediately
      const channel = supabase
        .channel('leads-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads',
            filter: `user_id=eq.${user.id}` },
          ({ new: row }) => {
            setLeads(prev => {
              if (prev.some(l => l.id === (row as Lead).id)) return prev
              return [row as Lead, ...prev]
            })
          }
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads',
            filter: `user_id=eq.${user.id}` },
          ({ new: row }) => {
            setLeads(prev => prev.map(l => l.id === (row as Lead).id ? row as Lead : l))
            setSelectedLead(prev => prev?.id === (row as Lead).id ? row as Lead : prev)
          }
        )
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' },
          ({ old: row }) => {
            const id = (row as { id: string }).id
            setLeads(prev => prev.filter(l => l.id !== id))
            setSelectedLead(prev => prev?.id === id ? null : prev)
          }
        )
        .subscribe()

      channelRef.current = channel
    })

    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current)
      }
    }
  }, [])

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

  async function handleQuickNote(id: string, notes: string) {
    await handleUpdate(id, { notes })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l))
  }

  async function handleSetHandler(id: string, newHandler: string | null) {
    await handleUpdate(id, { handler: newHandler ?? undefined })
  }

  function handleCreate(lead: Lead) {
    setLeads(prev => [lead, ...prev])
    setActiveStatus(lead.status)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLeads(prev => prev.filter(l => l.id !== id))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      setSelectedLead(null)
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size || deleting) return
    const ids = Array.from(selectedIds)
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads?ids=${ids.join(',')}`, { method: 'DELETE' })
      if (res.ok) {
        setLeads(prev => prev.filter(l => !selectedIds.has(l.id)))
        setSelectedIds(new Set())
        setSelectedLead(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function toggleAll() {
    const allFilteredIds = filtered.map(l => l.id)
    const allSelected = allFilteredIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (allSelected) allFilteredIds.forEach(id => n.delete(id))
      else allFilteredIds.forEach(id => n.add(id))
      return n
    })
  }

  function handleStatusChange(s: LeadStatus) {
    setActiveStatus(s)
    setSelectedIds(new Set())
  }

  const selectionCount = filtered.filter(l => selectedIds.has(l.id)).length

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Leads</h1>
          <p className="text-sm text-white/30 mt-2 font-medium">{leads.length} Einträge gesamt</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 bg-panel hover:bg-panel-hover text-white/60 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Importieren</span>
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Neuer Lead</span>
          </button>
        </div>
      </div>

      {/* Pipeline tabs */}
      <PipelineTabs
        activeStatus={activeStatus}
        counts={counts}
        onStatusChange={handleStatusChange}
      />

      {/* Search + bulk action bar */}
      <div className="mt-4 mb-4 flex gap-3 items-center">
        <div className="relative max-w-sm w-full">
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
          <div className="flex items-center gap-2 flex-1">
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
          <div className="flex items-center text-xs text-white/35 font-medium">
            {filtered.length} {filtered.length === 1 ? 'Lead' : 'Leads'}
          </div>
        )}
      </div>

      {/* Table */}
      <LeadTable
        leads={filtered}
        onLeadClick={setSelectedLead}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        currentUsername={currentUsername}
        onQuickNote={setQuickNoteLead}
        onSetHandler={handleSetHandler}
      />

      {/* Detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {/* Quick note modal */}
      {quickNoteLead && (
        <QuickNoteModal
          lead={quickNoteLead}
          onClose={() => setQuickNoteLead(null)}
          onSave={handleQuickNote}
        />
      )}

      {/* New lead modal */}
      {showNew && (
        <NewLeadModal
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); window.location.reload() }}
        />
      )}
    </div>
  )
}
