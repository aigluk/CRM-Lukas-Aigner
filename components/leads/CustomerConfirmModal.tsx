'use client'

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import type { Lead } from '@/lib/types'

export function CustomerConfirmModal({
  lead, onClose, onConfirm,
}: {
  lead: Lead
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  async function confirm() {
    setSaving(true)
    await onConfirm()
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-70 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="bg-panel w-full sm:max-w-sm rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-rim-subtle">
          <h2 className="text-base font-black text-white">Abschluss</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-white/60 leading-relaxed">
            <span className="font-bold text-white">{lead.name}</span> wurde auf Abschluss gesetzt. Soll der Lead jetzt als Kunde übernommen werden?
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              <UserPlus size={15} />
              {saving ? 'Wird angelegt…' : 'Als Kunde übernehmen'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-panel-hover text-white/50 hover:text-white text-sm font-bold rounded-xl transition-all"
            >
              Später
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
