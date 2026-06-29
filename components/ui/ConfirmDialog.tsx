'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'

export function ConfirmDialog({
  title = 'Löschen bestätigen',
  message,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onClose,
}: {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    await onConfirm()
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-70 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="bg-panel w-full sm:max-w-sm rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-rim-subtle">
          <h2 className="text-base font-black text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-white/60 leading-relaxed">{message}</p>
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              <Trash2 size={15} />
              {busy ? 'Wird gelöscht…' : confirmLabel}
            </button>
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-3 bg-panel-hover text-white/50 hover:text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
