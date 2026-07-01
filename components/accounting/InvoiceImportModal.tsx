'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Save, Upload, Loader2, Eye, AlertCircle, RefreshCw } from 'lucide-react'
import type { DocStatus } from '@/lib/types'
import { DatePicker } from './DatePicker'

const numberInputCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig',
}

export function InvoiceImportModal({
  nextNumberHint, onClose, onSaved,
}: { nextNumberHint: string; onClose: () => void; onSaved: () => void }) {
  const [docNumber, setDocNumber] = useState(nextNumberHint)
  const [clientName, setClientName] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [taxRate, setTaxRate] = useState('0')
  const [status, setStatus] = useState<DocStatus>('paid')

  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [isImage, setIsImage] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Refs for cleanup
  const listenerRef = useRef<(() => void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(d => {
      setTaxRate(d.company?.small_business ? '0' : '20')
    }).catch(() => {})
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function submitUpload() {
    const iframe = iframeRef.current
    const form = formRef.current
    if (!iframe || !form) return

    // Clean up any existing listener/timeout from a previous attempt
    if (listenerRef.current) {
      iframe.removeEventListener('load', listenerRef.current)
      listenerRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setUploading(true)
    setUploadError('')
    setUploadedPath(null)

    function finish(err?: string, path?: string) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (listenerRef.current) {
        iframe!.removeEventListener('load', listenerRef.current)
        listenerRef.current = null
      }
      if (path) setUploadedPath(path)
      if (err) setUploadError(err)
      setUploading(false)
    }

    // 30s timeout — handles the case where the OneDrive file download never completes
    timeoutRef.current = setTimeout(() => {
      finish('Datei nicht erreichbar. In OneDrive → Rechtsklick → "Immer auf diesem Gerät verfügbar" aktivieren.')
    }, 30_000)

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument ?? iframe.contentWindow?.document
        const text = (doc?.body?.innerText ?? doc?.body?.textContent ?? '').trim()

        // The iframe fires a load event for the about:blank interim state during
        // form submission — ignore it and wait for the actual response.
        if (!text || iframe.contentWindow?.location?.href === 'about:blank') return

        let data: Record<string, string>
        try { data = JSON.parse(text) }
        catch { finish('Unerwartete Antwort vom Server.'); return }

        if (data.file_path) {
          finish(undefined, data.file_path)
        } else if (data.error === 'Datei fehlt.' || data.error === 'Datei leer.') {
          finish('Datei nicht lesbar — in OneDrive → Rechtsklick → "Immer auf diesem Gerät verfügbar" aktivieren.')
        } else {
          finish(data.error ?? 'Upload fehlgeschlagen.')
        }
      } catch {
        // SecurityError on contentDocument access — shouldn't happen same-origin
        finish('Upload fehlgeschlagen (Sicherheitsfehler). Bitte erneut versuchen.')
      }
    }

    listenerRef.current = handleLoad
    iframe.addEventListener('load', handleLoad)
    form.submit()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    setIsImage(f.type.startsWith('image/'))
    setError('')
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
    submitUpload()
  }

  function triggerPicker() {
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  async function save() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Betrag fehlt.'); return }
    if (!clientName.trim()) { setError('Kundenname fehlt.'); return }
    if (!docNumber.trim()) { setError('Rechnungsnummer fehlt.'); return }
    if (!fileName) { setError('Bitte die Rechnungsdatei hochladen.'); return }
    if (uploading) { setError('Datei wird noch hochgeladen…'); return }
    if (uploadError || !uploadedPath) { setError('Datei-Upload fehlgeschlagen. Bitte Datei erneut auswählen.'); return }

    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('uploaded_path', uploadedPath)
      fd.append('doc_number', docNumber.trim())
      fd.append('client_name', clientName.trim())
      fd.append('issue_date', issueDate)
      fd.append('tax_rate', taxRate)
      fd.append('status', status)
      fd.append('amount', String(amt))
      const res = await fetch('/api/accounting/documents/import', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Import fehlgeschlagen.')
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
      {/* Hidden iframe receives the form POST response */}
      <iframe ref={iframeRef} name="upload-target" title="upload" className="hidden" />

      {/* Hidden form — file input must live inside it so native form submit carries file bytes */}
      <form
        ref={formRef}
        method="POST"
        action="/api/accounting/documents/import/upload"
        encType="multipart/form-data"
        target="upload-target"
        className="hidden"
      >
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />
      </form>

      <div className="bg-panel w-full sm:max-w-md rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">Rechnung importieren</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {fileName ? (
            // min-h ensures the overlay always has enough room regardless of inner content height
            <div className="relative rounded-xl overflow-hidden bg-dark min-h-20">
              {isImage && preview ? (
                <img src={preview} alt="" className="w-full max-h-56 object-contain" />
              ) : (
                <div className="flex items-center gap-3 px-4 py-5">
                  <span className="text-sm text-white/60 font-medium truncate min-w-0">{fileName}</span>
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/65 flex items-center justify-center gap-2 text-xs font-bold text-white">
                  <Loader2 size={14} className="animate-spin" />Wird hochgeladen…
                </div>
              )}

              {!uploading && uploadError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-5">
                  <div className="flex items-start gap-1.5 text-xs font-bold text-accent text-center leading-relaxed">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                  <button type="button" onClick={submitUpload}
                    className="flex items-center gap-1.5 bg-panel-hover hover:bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                    <RefreshCw size={12} />Nochmal versuchen
                  </button>
                </div>
              )}

              {!uploading && !uploadError && uploadedPath && (
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  {preview && (
                    <button type="button" onClick={() => setLightbox(true)}
                      className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                      <Eye size={13} />Vorschau
                    </button>
                  )}
                  <button type="button" onClick={triggerPicker}
                    className="bg-panel-hover text-white/70 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                    Ändern
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" onClick={triggerPicker}
              className="w-full flex flex-col items-center justify-center gap-2 bg-dark border border-dashed border-white/15 rounded-xl py-8 text-white/40 hover:text-white hover:border-white/30 transition-all">
              <Upload size={22} />
              <span className="text-sm font-bold">Bestehende Rechnung hochladen</span>
            </button>
          )}

          <div>
            <label className={labelCls}>Rechnungsnummer</label>
            <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inputCls} />
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
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} step="any" placeholder="0.00"
                className={`${inputCls} ${numberInputCls}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>USt-Satz (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} step="any"
                className={`${inputCls} ${numberInputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <div className="flex gap-1.5">
                {(['sent', 'paid'] as DocStatus[]).map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      status === s ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white'
                    }`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button onClick={save} disabled={saving || uploading}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]">
            {uploading
              ? <><Loader2 size={14} className="animate-spin" />Wird hochgeladen…</>
              : saving
                ? <><Loader2 size={14} className="animate-spin" />Importieren…</>
                : <><Save size={14} />Rechnung importieren</>}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>

      {lightbox && preview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-70 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-panel-hover text-white/70 hover:text-white transition-all">
            <X size={18} />
          </button>
          {isImage ? (
            <img src={preview} alt="" className="max-w-full max-h-full rounded-xl" onClick={e => e.stopPropagation()} />
          ) : (
            <iframe src={preview} title="Rechnungsvorschau"
              className="w-full h-full max-w-4xl bg-white rounded-xl border-0"
              onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  )
}
