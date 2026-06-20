'use client'

import { useState, useRef } from 'react'
import { X, Save, Upload, Loader2, Sparkles } from 'lucide-react'
import type { DocStatus } from '@/lib/types'
import { DatePicker } from './DatePicker'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function InvoiceImportModal({
  nextNumberHint, onClose, onSaved,
}: { nextNumberHint: string; onClose: () => void; onSaved: () => void }) {
  const [docNumber, setDocNumber] = useState(nextNumberHint)
  const [detectedNumber, setDetectedNumber] = useState('')
  const [clientName, setClientName] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [taxRate, setTaxRate] = useState('20')
  const [status, setStatus] = useState<DocStatus>('paid')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    if (!f.type.startsWith('image/')) return

    setOcrLoading(true)
    try {
      const base64 = await fileToBase64(f)
      const res = await fetch('/api/accounting/documents/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: f.type }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.client_name) setClientName(data.client_name)
        if (data.date) setIssueDate(data.date)
        if (data.amount) setAmount(String(data.amount))
        if (data.invoice_number) setDetectedNumber(data.invoice_number)
      }
    } catch {
      // OCR best-effort — manual entry still works
    } finally {
      setOcrLoading(false)
    }
  }

  async function save() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Betrag fehlt.'); return }
    if (!clientName.trim()) { setError('Kundenname fehlt.'); return }
    if (!docNumber.trim()) { setError('Rechnungsnummer fehlt.'); return }
    setSaving(true)
    setError('')

    try {
      const rate = parseFloat(taxRate) || 0
      const unitPrice = amt / (1 + rate / 100)
      const res = await fetch('/api/accounting/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: 'invoice',
          doc_number: docNumber.trim(),
          client_name: clientName.trim(),
          issue_date: issueDate,
          tax_rate: rate,
          status,
          line_items: [{ description: 'Leistung', qty: 1, unit_price: unitPrice }],
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Import fehlgeschlagen.')
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
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-panel w-full sm:max-w-md rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">Rechnung importieren</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Upload */}
          <input
            ref={fileRef} type="file" accept="image/*,application/pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {preview ? (
            <div className="relative">
              {file?.type.startsWith('image/') ? (
                <img src={preview} alt="" className="w-full max-h-56 object-contain bg-dark rounded-xl" />
              ) : (
                <div className="w-full py-8 bg-dark rounded-xl text-center text-sm text-white/40 font-medium">{file?.name}</div>
              )}
              {ocrLoading && (
                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white">
                  <Loader2 size={14} className="animate-spin" /> Texterkennung läuft…
                </div>
              )}
              <button
                type="button" onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 bg-panel-hover text-white/70 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              >
                Ändern
              </button>
            </div>
          ) : (
            <button
              type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 bg-dark border border-dashed border-white/15 rounded-xl py-8 text-white/40 hover:text-white hover:border-white/30 transition-all"
            >
              <Upload size={22} />
              <span className="text-sm font-bold">Bestehende Rechnung hochladen</span>
              <span className="text-xs text-white/25 flex items-center gap-1"><Sparkles size={11} />Daten werden automatisch erkannt</span>
            </button>
          )}

          <div>
            <label className={labelCls}>Rechnungsnummer</label>
            <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inputCls} />
            {detectedNumber && (
              <p className="text-[11px] text-white/30 mt-1">Auf dem Dokument erkannt: {detectedNumber}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Kunde</label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Name des Kunden" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Datum</label>
              <DatePicker value={issueDate} onChange={setIssueDate} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Betrag (€, brutto)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} step="any" placeholder="0.00" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>USt-Satz (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} step="any" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <div className="flex gap-1.5">
                {(['sent', 'paid'] as DocStatus[]).map(s => (
                  <button
                    key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      status === s ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button
            onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            <Save size={14} />
            {saving ? 'Importieren…' : 'Rechnung importieren'}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
