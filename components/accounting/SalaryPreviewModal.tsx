'use client'

import { X, Download } from 'lucide-react'
import type { AccountingSalaryEntry, SalaryEntryType } from '@/lib/types'

const TYPE_LABELS: Record<SalaryEntryType, string> = {
  employment: 'Anstellung',
  gf_salary:  'GF-Gehalt',
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function SalaryPreviewModal({
  entry,
  onClose,
}: {
  entry: AccountingSalaryEntry
  onClose: () => void
}) {
  const previewUrl  = `/api/accounting/salaries/${entry.id}/file`
  const downloadUrl = `/api/accounting/salaries/${entry.id}/file?dl=1`

  const subtitle = [
    entry.reference_number ?? `GH-${entry.period_year}`,
    TYPE_LABELS[entry.entry_type],
    entry.issue_date ? fmtDate(entry.issue_date) : String(entry.period_year),
  ].join(' · ')

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-70 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="bg-panel w-full sm:max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ height: 'calc(94dvh - env(safe-area-inset-bottom))' }}
      >
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-white truncate">{entry.employer_name}</h2>
            <p className="text-xs text-white/35 truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              title="Herunterladen"
              className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              <Download size={13} />Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-dark">
          <iframe
            src={previewUrl}
            title={`Lohnzettel ${entry.employer_name}`}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  )
}
