'use client'

import { X, Download } from 'lucide-react'
import type { AccountingReceipt, ReceiptType } from '@/lib/types'

const RECEIPT_TYPE_LABELS: Record<ReceiptType, string> = {
  expense: 'Ausgabe',
  cash: 'Barrechnung',
  income_other: 'Sonstige Einnahme',
}

export function ReceiptPreviewModal({ receipt, onClose }: { receipt: AccountingReceipt; onClose: () => void }) {
  const previewUrl = `/api/accounting/receipts/${receipt.id}/file`
  const downloadUrl = `/api/accounting/receipts/${receipt.id}/file?dl=1`

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
            <h2 className="text-base font-black text-white truncate">{receipt.vendor || RECEIPT_TYPE_LABELS[receipt.receipt_type]}</h2>
            <p className="text-xs text-white/35 truncate">{receipt.category || RECEIPT_TYPE_LABELS[receipt.receipt_type]}</p>
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
          <iframe src={previewUrl} title={`Beleg ${receipt.vendor ?? ''}`} className="w-full h-full border-0" />
        </div>
      </div>
    </div>
  )
}
