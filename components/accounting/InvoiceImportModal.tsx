'use client'

'use client'

import { useState, useRef } from 'react'
import { X, Save, Upload, Loader2, Eye } from 'lucide-react'
import type { DocStatus } from '@/lib/types'
import { DatePicker } from './DatePicker'

const numberInputCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig',
}

function bufferToBase64(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
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
  const [fileBlob, setFileBlob] = useState<Blob | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setError('')
    // Read into memory immediately — makes preview work regardless of source
    // (OneDrive, Google Drive, iCloud Drive all require the read to happen
    //  synchronously in the file-picker callback context on iOS)
    let buffer: ArrayBuffer
    try {
      buffer = await f.arrayBuffer()
    } catch {
      setError('Datei konnte nicht gelesen werden — bitte direkt aus "Auf meinem iPad/iPhone" auswählen.')
      return
    }
    if (!buffer.byteLength) {
      setError('Datei ist leer (0 Byte) — bitte erneut auswählen.')
      return
    }
    const mimeType = f.type || 'application/octet-stream'
    const blob = new Blob([buffer], { type: mimeType })
    setFileBlob(blob)
    setFileName(f.name)
    setFileType(mimeType)
    // Blob URL from local memory — always accessible, no cloud dependency
    setPreview(URL.createObjectURL(blob))

    if (!mimeType.startsWith('image/')) return
    setOcrLoading(true)
    try {
      const base64 = bufferToBase64(buffer, mimeType)
      const res = await fetch('/api/accounting/documents/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: mimeType }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.client_name) setClientName(data.client_name)
        if (data.date) setIssueDate(data.date)
        if (data.amount) setAmount(String(data.amount))
        if (data.invoice_number) setDetectedNumber(data.invoice_number)
      }
    } catch {
      // OCR best-effort
    } finally {
      setOcrLoading(false)
    }
  }

  async function save() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Betrag fehlt.'); return }
    if (!clientName.trim()) { setError('Kundenname fehlt.'); return }
    if (!docNumber.trim()) { setError('Rechnungsnummer fehlt.'); return }
    if (!fileBlob) { setError('Bitte die Rechnungsdatei hochladen.'); return }
    setSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', fileBlob, fileName)
      formData.append('doc_number', docNumber.trim())
      formData.append('client_name', clientName.trim())
      formData.append('issue_date', issueDate)
      formData.append('tax_rate', taxRate)
      formData.append('status', status)
      formData.append('amount', amount)

      const res = await fetch('/api/accounting/documents/import', {
        method: 'POST',
        body: formData,
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
            fileType.startsWith('image/') ? (
              <div className="relative">
                <img src={preview} alt="" className="w-full max-h-56 object-contain bg-dark rounded-xl" />
                {ocrLoading && (
                  <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white">
                    <Loader2 size={14} className="animate-spin" /> Texterkennung läuft…
                  </div>
                )}
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button
                    type="button" onClick={() => setLightbox(true)}
                    className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Eye size={13} />Vorschau
                  </button>
                  <button
                    type="button" onClick={() => fileRef.current?.click()}
                    className="bg-panel-hover text-white/70 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    Ändern
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 bg-dark rounded-xl p-4">
                <span className="text-sm text-white/40 font-medium truncate min-w-0">{fileName}</span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button" onClick={() => setLightbox(true)}
                    className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Eye size={13} />Vorschau
                  </button>
                  <button
                    type="button" onClick={() => fileRef.current?.click()}
                    className="bg-panel-hover text-white/70 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    Ändern
                  </button>
                </div>
              </div>
            )
          ) : (
            <button
              type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 bg-dark border border-dashed border-white/15 rounded-xl py-8 text-white/40 hover:text-white hover:border-white/30 transition-all"
            >
              <Upload size={22} />
              <span className="text-sm font-bold">Bestehende Rechnung hochladen</span>
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
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} step="any" placeholder="0.00" className={`${inputCls} ${numberInputCls}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>USt-Satz (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} step="any" className={`${inputCls} ${numberInputCls}`} />
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
      {lightbox && preview && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-70 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-panel-hover text-white/70 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
          {fileType.startsWith('image/') ? (
            <img src={preview} alt="" className="max-w-full max-h-full rounded-xl" onClick={e => e.stopPropagation()} />
          ) : (
            <iframe
              src={preview}
              title="Rechnungsvorschau"
              onClick={e => e.stopPropagation()}
              className="w-full h-full max-w-4xl bg-white rounded-xl border-0"
            />
          )}
        </div>
      )}
    </div>
  )
}
