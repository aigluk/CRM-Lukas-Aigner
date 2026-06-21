'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Lead } from '@/lib/types'

export function QuickNoteModal({
  lead, onClose, onSave,
}: {
  lead: Lead
  onClose: () => void
  onSave: (id: string, notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(lead.id, notes)
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-panel rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{lead.name}</p>
            <p className="text-xs text-white/30 mt-0.5">Notizen</p>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white transition-colors ml-4 shrink-0">
            <X size={17} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <textarea
            autoFocus
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={6}
            placeholder="Gesprächsverlauf, Beobachtungen..."
            className="w-full bg-dark rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
          />
          <button
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-40 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
