'use client'

import { useState, useRef } from 'react'
import { X, Save, FileUp, Eye, FileText } from 'lucide-react'
import type { AccountingSalaryEntry, SalaryEntryType } from '@/lib/types'
import { DatePicker } from './DatePicker'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'
const numberInputCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const TYPE_LABELS: Record<SalaryEntryType, string> = {
  employment: 'Anstellung',
  gf_salary:  'GF-Gehalt',
}

export function SalaryModal({
  entry,
  onClose,
  onSaved,
  onPreview,
}: {
  entry?: AccountingSalaryEntry
  onClose: () => void
  onSaved: () => void
  onPreview?: () => void
}) {
  const isEdit = !!entry
  const [employerName, setEmployerName] = useState(entry?.employer_name ?? '')
  const [grossAmount, setGrossAmount]   = useState(entry ? String(entry.gross_amount) : '')
  const [taxWithheld, setTaxWithheld]   = useState(entry ? String(entry.tax_withheld) : '')
  const [issueDate, setIssueDate]       = useState(
    entry?.issue_date ?? new Date().toISOString().slice(0, 10)
  )
  const [entryType, setEntryType]       = useState<SalaryEntryType>(entry?.entry_type ?? 'employment')
  const [notes, setNotes]               = useState(entry?.notes ?? '')
  const [file, setFile]                 = useState<File | null>(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const hasExistingFile = isEdit && !!entry.file_path

  async function save() {
    if (!employerName.trim()) { setError('Arbeitgeber fehlt.'); return }
    const gross = parseFloat(grossAmount)
    if (!gross || gross <= 0) { setError('Bruttobezug fehlt.'); return }

    setSaving(true)
    setError('')
    try {
      const periodYear = new Date(issueDate).getFullYear()
      const form = new FormData()
      if (isEdit) form.append('id', entry!.id)
      if (file) form.append('file', file)
      form.append('employer_name', employerName.trim())
      form.append('gross_amount', String(gross))
      form.append('tax_withheld', String(parseFloat(taxWithheld) || 0))
      form.append('period_year', String(periodYear))
      form.append('issue_date', issueDate)
      form.append('entry_type', entryType)
      form.append('notes', notes)

      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch('/api/accounting/salaries', { method, body: form })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Speichern fehlgeschlagen.')
      }
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="bg-panel w-full sm:max-w-md rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white">{isEdit ? 'Gehalt bearbeiten' : 'Gehalt / Lohnzettel erfassen'}</h2>
            {isEdit && entry.reference_number && (
              <p className="text-xs text-white/30 mt-0.5">{entry.reference_number}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Typ */}
          <div className="flex bg-dark rounded-xl p-1">
            {(Object.keys(TYPE_LABELS) as SalaryEntryType[]).map(t => (
              <button key={t} type="button" onClick={() => setEntryType(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  entryType === t ? 'bg-accent text-white' : 'text-white/40 hover:text-white'
                }`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Arbeitgeber */}
          <div>
            <label className={labelCls}>Arbeitgeber / Firma</label>
            <input type="text" value={employerName} onChange={e => setEmployerName(e.target.value)}
              placeholder="z. B. Muster GmbH" className={inputCls} />
          </div>

          {/* Beträge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Bruttobezug (€)</label>
              <input type="number" value={grossAmount} onChange={e => setGrossAmount(e.target.value)}
                step="any" placeholder="0.00" className={`${inputCls} ${numberInputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Lohnsteuer einbeh. (€)</label>
              <input type="number" value={taxWithheld} onChange={e => setTaxWithheld(e.target.value)}
                step="any" placeholder="0.00" className={`${inputCls} ${numberInputCls}`} />
            </div>
          </div>

          {/* Datum */}
          <div>
            <label className={labelCls}>Datum des Lohnzettels</label>
            <DatePicker
              value={issueDate}
              onChange={setIssueDate}
              placeholder="Datum wählen"
              className={inputCls}
            />
          </div>

          {/* Notizen */}
          <div>
            <label className={labelCls}>Notizen</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="z. B. Zeitraum Jan–Dez, Lohnzettel L16..." className={`${inputCls} resize-none`} />
          </div>

          {/* Lohnzettel Upload / Vorschau */}
          <div>
            <label className={labelCls}>Lohnzettel (L16) als PDF oder Bild</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />

            {file ? (
              <div className="flex items-center gap-3 bg-dark rounded-xl px-3.5 py-2.5">
                <FileUp size={14} className="text-accent shrink-0" />
                <span className="text-sm text-white/70 truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-white/30 hover:text-white transition-all shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : hasExistingFile ? (
              <div className="flex items-center gap-3 bg-dark rounded-xl px-3.5 py-2.5">
                <FileText size={14} className="text-white/40 shrink-0" />
                <span className="text-sm text-white/55 truncate flex-1">Lohnzettel hochgeladen</span>
                {onPreview && (
                  <button type="button" onClick={onPreview}
                    className="flex items-center gap-1 text-xs text-accent hover:opacity-75 transition-all shrink-0 font-bold">
                    <Eye size={12} /> Ansehen
                  </button>
                )}
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="text-xs text-white/30 hover:text-white transition-all shrink-0">
                  Ersetzen
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-dark border border-dashed border-white/15 rounded-xl py-6 text-white/40 hover:text-white hover:border-white/30 transition-all">
                <FileUp size={18} />
                <span className="text-sm font-bold">Lohnzettel hochladen</span>
              </button>
            )}
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]">
            <Save size={14} />
            {saving ? 'Speichern…' : 'Gehalt speichern'}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
