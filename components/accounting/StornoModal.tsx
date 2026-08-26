'use client'

import { useState, useEffect, type FocusEvent } from 'react'
import { X, Plus, Trash2, Save } from 'lucide-react'
import type { AccountingCustomer, AccountingDocument, LineItem } from '@/lib/types'
import { DatePicker } from '@/components/accounting/DatePicker'

function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select()
}

const inputCls = 'w-full bg-panel-2 rounded-xl px-3.5 py-2.5 text-sm text-dark placeholder-dark/25 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-dark/40 mb-1.5'

function emptyItem(): LineItem {
  return { description: '', qty: 1, unit_price: 0, duration: '1' }
}

function fmtMoney(n: number): string {
  return n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(d?: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function StornoModal({
  invoices,
  nextNumberHint,
  preselectedInvoice,
  onClose,
  onSaved,
}: {
  invoices: AccountingDocument[]
  nextNumberHint: string
  preselectedInvoice?: AccountingDocument
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'manual'>('existing')
  const [selectedId, setSelectedId] = useState(preselectedInvoice?.id ?? '')
  const [customers, setCustomers] = useState<AccountingCustomer[]>([])

  const [manualRefNumber, setManualRefNumber] = useState('')
  const [manualRefDate, setManualRefDate] = useState('')
  const [manualRefName, setManualRefName] = useState('')
  const [manualClientName, setManualClientName] = useState('')
  const [manualClientAddress, setManualClientAddress] = useState('')
  const [manualClientCountry, setManualClientCountry] = useState('')
  const [manualClientVat, setManualClientVat] = useState('')
  const [manualClientEmail, setManualClientEmail] = useState('')
  const [manualItems, setManualItems] = useState<LineItem[]>([emptyItem()])
  const [manualTaxRate, setManualTaxRate] = useState(20)
  const [manualTaxAdded, setManualTaxAdded] = useState(true)

  const [existingVatOverride, setExistingVatOverride] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/accounting/customers')
      .then(r => r.json())
      .then(d => setCustomers(d.customers ?? []))
      .catch(() => {})
  }, [])

  const selectedInvoice = invoices.find(d => d.id === selectedId) ?? preselectedInvoice ?? null

  const resolvedCustomer = selectedInvoice?.customer_id
    ? customers.find(c => c.id === selectedInvoice.customer_id) ?? null
    : null

  function resolvedClientField(invoiceField: string | null | undefined, customerField: string | null | undefined): string | null {
    return customerField?.trim() || invoiceField?.trim() || null
  }

  const effectiveClientName    = resolvedClientField(selectedInvoice?.client_name, resolvedCustomer?.name)
  const effectiveClientAddress = resolvedClientField(selectedInvoice?.client_address, resolvedCustomer?.address)
  const effectiveClientCountry = resolvedClientField(selectedInvoice?.client_country, resolvedCustomer?.country)
  const effectiveClientVat     = resolvedClientField(selectedInvoice?.client_vat, resolvedCustomer?.vat_number)
  const effectiveClientEmail   = resolvedClientField(selectedInvoice?.client_email, resolvedCustomer?.email)

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      let payload: Record<string, unknown>

      if (mode === 'existing') {
        if (!selectedInvoice) { setError('Bitte eine Rechnung auswählen.'); setSaving(false); return }
        const negatedItems = (selectedInvoice.line_items ?? []).map(item => ({
          ...item,
          unit_price: -Math.abs(item.unit_price),
        }))
        payload = {
          doc_type:        'storno',
          issue_date:      issueDate,
          customer_id:     selectedInvoice.customer_id ?? null,
          client_name:     effectiveClientName ?? selectedInvoice.client_name,
          client_address:  effectiveClientAddress,
          client_country:  effectiveClientCountry,
          client_vat:      existingVatOverride.trim() || effectiveClientVat,
          client_email:    effectiveClientEmail,
          line_items:      negatedItems,
          tax_rate:        selectedInvoice.tax_rate,
          notes:           notes || null,
          storno_of_number: selectedInvoice.doc_number,
          storno_of_date:   selectedInvoice.issue_date,
          storno_of_name:   null,
          status:          'draft',
        }
      } else {
        if (!manualRefNumber.trim()) { setError('Bitte die Rechnungsnummer der Originalrechnung angeben.'); setSaving(false); return }
        if (!manualClientName.trim()) { setError('Bitte den Kundennamen angeben.'); setSaving(false); return }
        if (manualItems.some(i => !i.description.trim())) { setError('Bitte alle Positionen ausfüllen.'); setSaving(false); return }
        const negatedItems = manualItems.map(item => ({
          ...item,
          unit_price: -Math.abs(item.unit_price),
        }))
        payload = {
          doc_type:        'storno',
          issue_date:      issueDate,
          client_name:     manualClientName.trim(),
          client_address:  manualClientAddress || null,
          client_country:  manualClientCountry || null,
          client_vat:      manualClientVat || null,
          client_email:    manualClientEmail || null,
          line_items:      negatedItems,
          tax_rate:        manualTaxAdded ? manualTaxRate : 0,
          notes:           notes || null,
          storno_of_number: manualRefNumber.trim(),
          storno_of_date:   manualRefDate || null,
          storno_of_name:   manualRefName.trim() || null,
          status:          'draft',
        }
      }

      const res = await fetch('/api/accounting/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Fehler beim Speichern')
      }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  const manualSubtotal = manualItems.reduce((s, i) => s + i.qty * Math.abs(i.unit_price), 0)
  const manualTax = manualTaxAdded ? manualSubtotal * (manualTaxRate / 100) : 0
  const manualTotal = -(manualSubtotal + manualTax)

  const existingSubtotal = (selectedInvoice?.line_items ?? []).reduce((s, i) => s + i.qty * i.unit_price, 0)
  const existingTax = existingSubtotal * ((selectedInvoice?.tax_rate ?? 0) / 100)
  const existingTotal = -(existingSubtotal + existingTax)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-panel rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-rim-subtle">
          <div>
            <h2 className="text-lg font-black text-dark">Stornorechnung erstellen</h2>
            <p className="text-xs text-dark/40 mt-0.5 font-medium">{nextNumberHint}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-panel-2 hover:bg-panel-hover flex items-center justify-center text-dark/40 hover:text-dark transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5 px-6 pt-4 shrink-0">
          <button
            onClick={() => setMode('existing')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'existing' ? 'bg-accent text-white' : 'bg-panel-2 text-dark/50 hover:text-dark'}`}
          >
            Rechnung auswählen
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'manual' ? 'bg-accent text-white' : 'bg-panel-2 text-dark/50 hover:text-dark'}`}
          >
            Manuelle Referenz
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">

          {mode === 'existing' ? (
            <>
              <div>
                <label className={labelCls}>Originalrechnung</label>
                {preselectedInvoice ? (
                  <div className="bg-panel-2 rounded-xl px-3.5 py-2.5 text-sm text-dark/70">
                    {preselectedInvoice.doc_number} &nbsp;&middot;&nbsp; {preselectedInvoice.client_name} &nbsp;&middot;&nbsp; {fmtDate(preselectedInvoice.issue_date)}
                  </div>
                ) : (
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className={inputCls + ' appearance-none cursor-pointer'}
                  >
                    <option value="">-- Rechnung auswählen --</option>
                    {invoices
                      .filter(d => d.doc_type === 'invoice')
                      .sort((a, b) => b.doc_number.localeCompare(a.doc_number))
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.doc_number} · {d.client_name} · {fmtDate(d.issue_date)}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {selectedInvoice && (
                <div className="bg-panel-2 rounded-2xl px-4 py-4 space-y-2">
                  <p className="text-xs font-black text-dark/40 uppercase tracking-widest mb-3">Kundendaten auf der Stornorechnung</p>
                  <div className="space-y-1.5 mb-4">
                    {effectiveClientName && (
                      <div className="flex gap-3">
                        <span className="text-xs text-dark/40 w-20 shrink-0">Kunde</span>
                        <span className="text-xs text-dark/70">{effectiveClientName}</span>
                      </div>
                    )}
                    {effectiveClientAddress && (
                      <div className="flex gap-3">
                        <span className="text-xs text-dark/40 w-20 shrink-0">Anschrift</span>
                        <span className="text-xs text-dark/70">{effectiveClientAddress}</span>
                      </div>
                    )}
                    {effectiveClientCountry && (
                      <div className="flex gap-3">
                        <span className="text-xs text-dark/40 w-20 shrink-0">Land</span>
                        <span className="text-xs text-dark/70">{effectiveClientCountry}</span>
                      </div>
                    )}
                    <div className="flex gap-3 items-center">
                      <span className="text-xs text-dark/40 w-20 shrink-0">UID / VAT</span>
                      <input
                        type="text"
                        value={existingVatOverride || effectiveClientVat || ''}
                        onChange={e => setExistingVatOverride(e.target.value)}
                        placeholder={effectiveClientVat || 'ATU00000000 / VAT ID...'}
                        className="flex-1 bg-white rounded-lg px-2.5 py-1 text-xs text-dark placeholder-dark/25 outline-none focus:ring-1 focus:ring-accent transition-all"
                      />
                    </div>
                  </div>

                  <p className="text-xs font-black text-dark/40 uppercase tracking-widest mb-2">Stornopositionen</p>
                  {(selectedInvoice.line_items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <p className="text-sm text-dark/70 truncate">{item.description}</p>
                      <p className="text-sm font-bold text-accent shrink-0">-{fmtMoney(item.qty * item.unit_price)}</p>
                    </div>
                  ))}
                  <div className="border-t border-dark/8 mt-3 pt-3 flex justify-between">
                    <p className="text-sm font-black text-dark">Gesamt</p>
                    <p className="text-sm font-black text-accent">{fmtMoney(existingTotal)}</p>
                  </div>
                  {selectedInvoice.tax_rate > 0 && (
                    <p className="text-xs text-dark/40">inkl. {selectedInvoice.tax_rate}% USt.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Rechnungsnr. der Originalrechnung</label>
                  <input
                    className={inputCls}
                    placeholder="z.B. RE-2023-045"
                    value={manualRefNumber}
                    onChange={e => setManualRefNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Datum der Originalrechnung</label>
                  <DatePicker value={manualRefDate} onChange={setManualRefDate} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Name/Bezeichnung auf der Originalrechnung (optional)</label>
                <input
                  className={inputCls}
                  placeholder="z.B. Muster GmbH (optional)"
                  value={manualRefName}
                  onChange={e => setManualRefName(e.target.value)}
                />
              </div>

              <div className="border-t border-rim-subtle pt-5 space-y-3">
                <p className="text-xs font-black text-dark/40 uppercase tracking-widest">Angaben zum Kunden</p>
                <div>
                  <label className={labelCls}>Firmenname / Kundenname</label>
                  <input className={inputCls} placeholder="z.B. Muster GmbH" value={manualClientName} onChange={e => setManualClientName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Anschrift</label>
                  <input className={inputCls} placeholder="Straße, PLZ Ort" value={manualClientAddress} onChange={e => setManualClientAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Land</label>
                    <input className={inputCls} placeholder="z.B. Österreich" value={manualClientCountry} onChange={e => setManualClientCountry(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>USt.-IdNr. (optional)</label>
                    <input className={inputCls} placeholder="z.B. ATU12345678" value={manualClientVat} onChange={e => setManualClientVat(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>E-Mail (optional)</label>
                  <input className={inputCls} type="email" placeholder="kontakt@beispiel.at" value={manualClientEmail} onChange={e => setManualClientEmail(e.target.value)} />
                </div>
              </div>

              <div className="border-t border-rim-subtle pt-5 space-y-3">
                <p className="text-xs font-black text-dark/40 uppercase tracking-widest">Positionen (Beträge werden automatisch negiert)</p>
                {manualItems.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        className={inputCls + ' flex-1'}
                        placeholder="Beschreibung"
                        value={item.description}
                        onChange={e => setManualItems(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                      />
                      {manualItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setManualItems(prev => prev.filter((_, j) => j !== i))}
                          className="w-8 h-8 rounded-xl bg-panel-2 hover:bg-accent/10 flex items-center justify-center text-dark/30 hover:text-accent transition-all shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelCls}>Anzahl</label>
                        <input
                          type="number" min="0" step="any"
                          className={inputCls}
                          value={item.qty}
                          onFocus={selectAllOnFocus}
                          onChange={e => setManualItems(prev => prev.map((x, j) => j === i ? { ...x, qty: parseFloat(e.target.value) || 0 } : x))}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Einzelpreis (EUR)</label>
                        <input
                          type="number" min="0" step="0.01"
                          className={inputCls}
                          value={item.unit_price}
                          onFocus={selectAllOnFocus}
                          onChange={e => setManualItems(prev => prev.map((x, j) => j === i ? { ...x, unit_price: parseFloat(e.target.value) || 0 } : x))}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Laufzeit</label>
                        <input
                          className={inputCls}
                          placeholder="-"
                          value={item.duration ?? ''}
                          onChange={e => setManualItems(prev => prev.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setManualItems(prev => [...prev, emptyItem()])}
                  className="flex items-center gap-2 text-xs font-bold text-dark/50 hover:text-dark transition-colors"
                >
                  <Plus size={13} /> Position hinzufügen
                </button>

                <div className="flex items-center gap-3 pt-1">
                  {manualTaxAdded ? (
                    <>
                      <label className={labelCls + ' mb-0'}>USt. (%)</label>
                      <input
                        type="number" min="0" max="100"
                        className="w-20 bg-panel-2 rounded-xl px-3 py-2 text-sm text-dark outline-none focus:ring-1 focus:ring-accent"
                        value={manualTaxRate}
                        onFocus={selectAllOnFocus}
                        onChange={e => setManualTaxRate(parseFloat(e.target.value) || 0)}
                      />
                      <button type="button" onClick={() => setManualTaxAdded(false)} className="text-xs text-dark/40 hover:text-dark transition-colors">entfernen</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setManualTaxAdded(true); setManualTaxRate(20) }} className="text-xs font-bold text-dark/50 hover:text-dark transition-colors">
                      + Umsatzsteuer hinzufügen
                    </button>
                  )}
                </div>

                <div className="bg-panel-2 rounded-xl px-4 py-3 text-right space-y-1">
                  <p className="text-xs text-dark/50">Netto: {fmtMoney(-manualSubtotal)}</p>
                  {manualTaxAdded && <p className="text-xs text-dark/50">USt. {manualTaxRate}%: {fmtMoney(-manualTax)}</p>}
                  <p className="text-sm font-black text-accent">Gesamt: {fmtMoney(manualTotal)}</p>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-rim-subtle pt-5 grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Stornodatum</label>
              <DatePicker value={issueDate} onChange={setIssueDate} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Hinweis / Notiz (optional)</label>
            <textarea
              rows={2}
              className="w-full bg-panel-2 rounded-xl px-3.5 py-2.5 text-sm text-dark placeholder-dark/25 outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
              placeholder="Interne Notiz zur Stornorechnung"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-xs font-bold text-accent">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 shrink-0 border-t border-rim-subtle flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-dark/50 hover:text-dark transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Stornorechnung erstellen
          </button>
        </div>
      </div>
    </div>
  )
}
