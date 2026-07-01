'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Save, Upload, Loader2, Eye, AlertCircle, RefreshCw } from 'lucide-react'
import type { DocStatus, AccountingCustomer } from '@/lib/types'
import { DatePicker } from './DatePicker'

const numberInputCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig',
}

// macOS restricts Chrome from reading files managed by cloud providers
// (OneDrive, iCloud) when the Desktop/Documents folder is cloud-synced.
// Downloads folder always works because Chrome has an explicit sandbox entitlement for it.
const CLOUD_FILE_MSG =
  'Diese Datei kann nicht direkt gelesen werden (OneDrive/Cloud-Datei). ' +
  'Bitte eine dieser Lösungen wählen:\n' +
  '① Datei in den Downloads-Ordner kopieren → von dort erneut auswählen\n' +
  '② In OneDrive: Rechtsklick auf die Datei → „Immer auf diesem Gerät verfügbar halten" → erneut versuchen'

export function InvoiceImportModal({
  nextNumberHint, onClose, onSaved,
}: { nextNumberHint: string; onClose: () => void; onSaved: () => void }) {
  const [docNumber, setDocNumber] = useState(nextNumberHint)
  const [clientName, setClientName] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [taxRate, setTaxRate] = useState('0')
  const [status, setStatus] = useState<DocStatus>('paid')

  // Customer autocomplete
  const [customers, setCustomers] = useState<AccountingCustomer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const clientInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [isImage, setIsImage] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(false)

  // Iframe form-submit fallback (Safari / browsers without showOpenFilePicker)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframeListenerRef = useRef<(() => void) | null>(null)
  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(d => {
      setTaxRate(d.company?.small_business ? '0' : '20')
    }).catch(() => {})
    fetch('/api/accounting/customers').then(r => r.json()).then(d => {
      setCustomers(d.customers ?? [])
    }).catch(() => {})
    return () => {
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current)
    }
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        !clientInputRef.current?.contains(e.target as Node) &&
        !suggestionsRef.current?.contains(e.target as Node)
      ) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filteredCustomers = useCallback(() => {
    if (!clientName.trim()) return customers.slice(0, 8)
    const q = clientName.toLowerCase()
    return customers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [customers, clientName])

  // ─── Primary upload: File System Access API + arrayBuffer + fetch ──────────
  // Chrome/Edge support showOpenFilePicker which uses proper macOS file
  // coordination — unlike <input type="file">, it can trigger on-demand
  // downloads for cloud-provider files (OneDrive, Google Drive, iCloud).
  async function uploadViaFetch(f: File) {
    setUploading(true)
    setUploadError('')
    setUploadedPath(null)
    try {
      let buf: ArrayBuffer
      try {
        buf = await Promise.race<ArrayBuffer>([
          f.arrayBuffer(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 25_000)),
        ])
      } catch {
        // arrayBuffer() fails for cloud-only files (OneDrive/iCloud Files-on-Demand)
        // when macOS's File Provider Extension denies access to Chrome's sandbox.
        // No browser JS API can bypass this — the user must use Downloads folder.
        throw new Error(CLOUD_FILE_MSG)
      }

      if (!buf.byteLength) throw new Error(CLOUD_FILE_MSG)

      const fd = new FormData()
      fd.append('file', new Blob([buf], { type: f.type || 'application/octet-stream' }), f.name)
      const res = await fetch('/api/accounting/documents/import/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload fehlgeschlagen.')
      setUploadedPath(data.file_path)
    } catch (e: any) {
      setUploadError(e.message || CLOUD_FILE_MSG)
    } finally {
      setUploading(false)
    }
  }

  // ─── Fallback upload: native form → hidden iframe ──────────────────────────
  // Used when showOpenFilePicker is unavailable (Safari) or as retry path.
  function uploadViaIframe() {
    const iframe = iframeRef.current
    const form = formRef.current
    if (!iframe || !form) return

    if (iframeListenerRef.current) {
      iframe.removeEventListener('load', iframeListenerRef.current)
      iframeListenerRef.current = null
    }
    if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current)

    setUploading(true)
    setUploadError('')
    setUploadedPath(null)

    function finish(err?: string, path?: string) {
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current)
      if (iframeListenerRef.current) {
        iframe!.removeEventListener('load', iframeListenerRef.current)
        iframeListenerRef.current = null
      }
      if (path) setUploadedPath(path)
      if (err) setUploadError(err)
      setUploading(false)
    }

    iframeTimeoutRef.current = setTimeout(() => finish(CLOUD_FILE_MSG), 25_000)

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument ?? iframe.contentWindow?.document
        const text = (doc?.body?.innerText ?? doc?.body?.textContent ?? '').trim()
        // Skip the about:blank interim load that fires before the real response
        if (!text || iframe.contentWindow?.location?.href === 'about:blank') return

        let data: Record<string, string>
        try { data = JSON.parse(text) }
        catch { finish('Unerwartete Server-Antwort.'); return }

        if (data.file_path) finish(undefined, data.file_path)
        else if (data.error === 'Datei fehlt.' || data.error === 'Datei leer.') finish(CLOUD_FILE_MSG)
        else finish(data.error ?? 'Upload fehlgeschlagen.')
      } catch {
        // SecurityError: browser loaded an error page (cross-origin) instead
        // of our response — means the OS couldn't read the cloud-only file
        finish(CLOUD_FILE_MSG)
      }
    }

    iframeListenerRef.current = handleLoad
    iframe.addEventListener('load', handleLoad)
    form.submit()
  }

  async function handleFileSelected(f: File) {
    setFileName(f.name)
    setIsImage(f.type.startsWith('image/'))
    setError('')
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
    await uploadViaFetch(f)
  }

  async function triggerPicker() {
    // File System Access API: better cloud file support (Chrome 86+, Edge)
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'Rechnung (PDF oder Bild)',
            accept: {
              'application/pdf': ['.pdf'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
              'image/heic': ['.heic'],
            },
          }],
          multiple: false,
          excludeAcceptAllOption: false,
        })
        const file: File = await handle.getFile()
        await handleFileSelected(file)
        return
      } catch (e: any) {
        if (e.name === 'AbortError') return // User cancelled
        // Fall through to traditional input on any other error
      }
    }
    // Fallback: traditional <input> → iframe form submit
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
      if (customerId) fd.append('customer_id', customerId)
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

  const showFileArea = !!fileName

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {/* Iframe + form for Safari/fallback upload path */}
      <iframe ref={iframeRef} name="upload-target" title="upload" className="hidden" />
      <form ref={formRef} method="POST" action="/api/accounting/documents/import/upload"
        encType="multipart/form-data" target="upload-target" className="hidden">
        <input ref={fileInputRef} type="file" name="file" accept="image/*,application/pdf"
          onChange={e => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]) }} />
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

          {/* ── File area ───────────────────────────────────────────────── */}
          {showFileArea ? (
            <div className="rounded-xl bg-dark overflow-hidden">

              {/* Error state: standalone block (no absolute overlay → never clips) */}
              {!uploading && uploadError ? (
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-white/40">
                    <span className="truncate min-w-0">{fileName}</span>
                    <button type="button" onClick={triggerPicker}
                      className="shrink-0 text-white/30 hover:text-white underline text-[11px] transition-all">
                      Andere Datei
                    </button>
                  </div>
                  <div className="flex items-start gap-2 bg-accent/10 rounded-xl p-3">
                    <AlertCircle size={14} className="shrink-0 text-accent mt-0.5" />
                    <div className="text-xs text-accent leading-relaxed font-medium space-y-1.5">
                      {uploadError.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={triggerPicker}
                    className="flex items-center justify-center gap-1.5 bg-panel-hover hover:bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all">
                    <RefreshCw size={12} />Datei erneut auswählen
                  </button>
                </div>
              ) : (
                /* Normal / loading state */
                <div className="relative">
                  {isImage && preview ? (
                    <>
                      <img src={preview} alt="" className="w-full max-h-56 object-contain" />
                      {!uploading && uploadedPath && (
                        <div className="absolute bottom-2 right-2 flex gap-1.5">
                          <button type="button" onClick={() => setLightbox(true)}
                            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                            <Eye size={13} />Vorschau
                          </button>
                          <button type="button" onClick={triggerPicker}
                            className="bg-panel-hover text-white/70 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                            Ändern
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    /* PDF: inline row — filename truncates, buttons stay right */
                    <div className="flex items-center gap-2 px-4 py-3.5">
                      <span className="text-sm text-white/60 font-medium truncate min-w-0 flex-1">
                        {fileName}
                      </span>
                      {!uploading && uploadedPath && (
                        <div className="flex gap-1.5 shrink-0">
                          <button type="button" onClick={() => setLightbox(true)}
                            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                            <Eye size={13} />Vorschau
                          </button>
                          <button type="button" onClick={triggerPicker}
                            className="bg-panel-hover text-white/70 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                            Ändern
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {uploading && (
                    <div className="absolute inset-0 bg-black/65 flex items-center justify-center gap-2 text-xs font-bold text-white rounded-xl">
                      <Loader2 size={14} className="animate-spin" />Wird hochgeladen…
                    </div>
                  )}
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

          <div className="relative">
            <label className={labelCls}>Kunde</label>
            <input
              ref={clientInputRef}
              type="text"
              value={clientName}
              onChange={e => { setClientName(e.target.value); setCustomerId(null); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Name des Kunden oder tippen zum Suchen…"
              className={inputCls}
              autoComplete="off"
            />
            {showSuggestions && filteredCustomers().length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full mt-1 bg-panel border border-rim-subtle rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                {filteredCustomers().map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault() // prevent input blur before click registers
                      setClientName(c.name)
                      setCustomerId(c.id)
                      setShowSuggestions(false)
                    }}
                    className="w-full flex flex-col px-3.5 py-2.5 text-left hover:bg-panel-hover transition-colors group"
                  >
                    <span className="text-sm font-bold text-white group-hover:text-white">{c.name}</span>
                    {c.address && (
                      <span className="text-xs text-white/30 truncate">{c.address}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
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
