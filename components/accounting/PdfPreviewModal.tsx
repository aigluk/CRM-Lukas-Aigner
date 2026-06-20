'use client'

import { X, Download } from 'lucide-react'
import type { AccountingDocument } from '@/lib/types'

export function PdfPreviewModal({ doc, onClose }: { doc: AccountingDocument; onClose: () => void }) {
  const previewUrl = `/api/accounting/documents/${doc.id}/pdf`
  const downloadUrl = `/api/accounting/documents/${doc.id}/pdf?dl=1`

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-panel w-full sm:max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ height: 'calc(94dvh - env(safe-area-inset-bottom))' }}
      >
        <div className="shrink-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-white truncate">{doc.doc_number}</h2>
            <p className="text-xs text-white/35 truncate">{doc.client_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              title="Herunterladen"
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              <Download size={13} />Download
            </a>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-dark">
          <iframe src={previewUrl} title={`Vorschau ${doc.doc_number}`} className="w-full h-full border-0" />
        </div>
      </div>
    </div>
  )
}
