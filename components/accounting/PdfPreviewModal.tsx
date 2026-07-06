'use client'

import { useState, useEffect } from 'react'
import { X, Download, FileText, ExternalLink } from 'lucide-react'
import type { AccountingDocument } from '@/lib/types'

export function PdfPreviewModal({ doc, onClose }: { doc: AccountingDocument; onClose: () => void }) {
  const previewUrl = `/api/accounting/documents/${doc.id}/pdf`
  const downloadUrl = `/api/accounting/documents/${doc.id}/pdf?dl=1`
  const iframeUrl = `${previewUrl}#zoom=page-fit&toolbar=0`

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
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
              <Download size={13} />Herunterladen
            </a>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-dark flex flex-col">
          {isMobile ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
              <FileText size={52} className="text-white/15" />
              <p className="text-white/40 text-sm text-center leading-relaxed">
                PDF-Vorschau auf Mobilgeräten nicht verfügbar.
              </p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-accent text-white px-5 py-3 rounded-xl text-sm font-bold active:opacity-80"
              >
                <ExternalLink size={15} />
                Im Browser öffnen
              </a>
            </div>
          ) : (
            <iframe src={iframeUrl} title={`Vorschau ${doc.doc_number}`} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  )
}
