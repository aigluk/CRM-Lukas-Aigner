'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import type { AccountingDocument, DocStatus, AccountingCustomer } from '@/lib/types'
import { DatePicker } from './DatePicker'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'
const numberInputCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig',
}

function docGross(doc: AccountingDocument): number {
  const net = (doc.line_items ?? []).reduce((s, i) => s + i.qty * i.unit_price, 0)
  return net * (1 + doc.tax_rate / 100)
}

export function ImportedInvoiceEditModal({
  doc, onClose, onSaved,
}: { doc: AccountingDocument; onClose: () => void; onSaved: (updated: AccountingDocument) => void }) {
  const [docNumber, setDocNumber] = useState(doc.doc_number)
  const [clientName, setClientName] = useState(doc.client_name)
  const [customerId, setCustomerId] = useState<string | null>(doc.customer_id ?? null)
  const [issueDate, setIssueDate] = useState(doc.issue_date)
  const [amount, setAmount] = useState(docGross(doc).toFixed(2))
  const [taxRate, setTaxRate] = useState(String(doc.tax_rate))
  const [status, setStatus] = useState<DocStatus>(doc.status)

  const [customers, setCustomers] = useState<AccountingCustomer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const clientInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/accounting/customers').then(r => r.json()).then(d => {
      setCustomers(d.customers ?? [])
    }).catch(() => {})
  }, [])

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

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(clientName.toLowerCase()) && clientName.length > 0
  )

  async function save() {
    setError('')
    const gross = parseFloat(amount)
    if (!docNumber.trim()) { setError('Rechnungsnummer fehlt.'); return }
    if (!clientName.trim()) { setError('Kunde fehlt.'); return }
    if (!gross || gross <= 0) { setError('Betrag ungültig.'); return }

    const rate = parseFloat(taxRate) || 0
    const unitPrice = gross / (1 + rate / 100)

    setSaving(true)
    try {
      const res = await fetch('/api/accounting/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doc.id,
          doc_number: docNumber.trim(),
          client_name: clientName.trim(),
          customer_id: customerId ?? null,
          issue_date: issueDate,
          tax_rate: rate,
          status,
          line_items: [{ description: doc.line_items?.[0]?.description ?? 'Leistung', qty: 1, unit_price: unitPrice }],
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Fehler beim Speichern.'); return }
      onSaved(json.document)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-panel rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
          <div>
            <h2 className="text-sm font-bold text-white">Rechnung bearbeiten</h2>
            <p className="text-xs text-white/30 mt-0.5">{doc.doc_number}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
            <X size={14} />
          </button>
        </div>

        {/* PDF Preview */}
        <div className="mx-5 mt-4 rounded-xl overflow-hidden bg-dark" style={{ height: 220 }}>
          <iframe
            src={`/api/accounting/documents/${doc.id}/pdf`}
            className="w-full h-full border-0"
            title="Rechnungsvorschau"
          />
        </div>

        {/* Form */}
        <div className="p-5 flex flex-col gap-4">
          {/* Rechnungsnummer */}
          <div>
            <label className={labelCls}>Rechnungsnummer</label>
            <input className={inputCls} value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="RE-2026-001" />
          </div>

          {/* Kunde */}
          <div className="relative">
            <label className={labelCls}>Kunde</label>
            <input
              ref={clientInputRef}
              className={inputCls}
              value={clientName}
              onChange={e => {
                setClientName(e.target.value)
                setCustomerId(null)
                setShowSuggestions(true)
              }}
              onFocus={() => clientName.length > 0 && setShowSuggestions(true)}
              placeholder="Kundenname"
            />
            {showSuggestions && filteredCustomers.length > 0 && (
              <div ref={suggestionsRef} className="absolute left-0 right-0 top-full mt-1 z-50 bg-panel border border-white/10 rounded-xl shadow-xl overflow-hidden">
                {filteredCustomers.slice(0, 6).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3.5 py-2.5 text-sm text-white hover:bg-white/8 transition-colors border-b border-white/5 last:border-0"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setClientName(c.name)
                      setCustomerId(c.id)
                      setShowSuggestions(false)
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.contact_person && <span className="text-white/30 text-xs ml-2">{c.contact_person}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datum */}
          <div>
            <label className={labelCls}>Rechnungsdatum</label>
            <DatePicker value={issueDate} onChange={setIssueDate} />
          </div>

          {/* Betrag + USt */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Betrag brutto (€)</label>
              <input
                className={`${inputCls} ${numberInputCls}`}
                type="number" step="0.01" min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>USt-Satz (%)</label>
              <input
                className={`${inputCls} ${numberInputCls}`}
                type="number" step="1" min="0" max="100"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_LABELS) as DocStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    status === s
                      ? 'bg-accent text-white'
                      : 'bg-dark text-white/40 hover:text-white/70'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 bg-dark text-white/50 hover:text-white text-sm font-semibold py-2.5 rounded-xl transition-all">
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-bold py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
