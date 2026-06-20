'use client'

import { useState, useEffect, type FocusEvent } from 'react'
import { X, Plus, Trash2, Save, ChevronDown } from 'lucide-react'
import type { AccountingCustomer, AccountingDocument, DocLanguage, DocType, LineItem } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { DatePicker } from '@/components/accounting/DatePicker'

function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select()
}

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

function emptyItem(): LineItem {
  return { description: '', qty: 1, unit_price: 0, duration: '' }
}

function fmtMoney(n: number): string {
  return n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function DocumentModal({
  docType, doc, nextNumberHint, onClose, onSaved,
}: {
  docType: DocType
  doc?: AccountingDocument
  nextNumberHint?: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!doc
  const [customers, setCustomers] = useState<AccountingCustomer[]>([])
  const [customerId, setCustomerId] = useState(doc?.customer_id ?? '')
  const [docNumber, setDocNumber]   = useState(doc?.doc_number ?? nextNumberHint ?? '')
  const [clientName, setClientName] = useState(doc?.client_name ?? '')
  const [clientAddress, setClientAddress] = useState(doc?.client_address ?? '')
  const [clientCountry, setClientCountry] = useState(doc?.client_country ?? '')
  const [clientVat, setClientVat] = useState(doc?.client_vat ?? '')
  const [clientEmail, setClientEmail] = useState(doc?.client_email ?? '')
  const [issueDate, setIssueDate]   = useState(doc?.issue_date ?? new Date().toISOString().slice(0, 10))
  const [serviceDate, setServiceDate] = useState(doc?.service_date ?? '')
  const [dueDate, setDueDate]       = useState(doc?.due_date ?? '')
  const [language, setLanguage]     = useState<DocLanguage>(doc?.language ?? 'de')
  const [smallBusiness, setSmallBusiness] = useState(false)
  const [taxAdded, setTaxAdded]     = useState(!!doc && doc.tax_rate > 0)
  const [taxRate, setTaxRate]       = useState(doc?.tax_rate ?? 0)
  const [notes, setNotes]           = useState(doc?.notes ?? '')
  const [items, setItems]           = useState<LineItem[]>(doc?.line_items?.length ? doc.line_items : [emptyItem()])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    fetch('/api/accounting/customers').then(r => r.json()).then(d => setCustomers(d.customers ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setSmallBusiness(!!data.user?.user_metadata?.company?.small_business)
    })
  }, [])

  function addTax() { setTaxAdded(true); setTaxRate(20) }
  function removeTax() { setTaxAdded(false); setTaxRate(0) }

  const subtotal = items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0)
  const effectiveTaxRate = smallBusiness ? 0 : taxRate
  const tax = subtotal * (effectiveTaxRate / 100)
  const total = subtotal + tax

  function applyCustomer(id: string) {
    setCustomerId(id)
    const c = customers.find(x => x.id === id)
    if (c) {
      setClientName(c.name)
      setClientAddress(c.address || '')
      setClientCountry(c.country || '')
      setClientVat(c.vat_number || '')
      setClientEmail(c.email || '')
    }
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }
  function addItem() { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function save() {
    if (!clientName.trim()) { setError('Kunde/Empfänger fehlt.'); return }
    if (!items.some(i => i.description.trim())) { setError('Mindestens eine Position erforderlich.'); return }
    setSaving(true)
    setError('')

    const payload = {
      doc_type: docType,
      doc_number: docNumber,
      customer_id: customerId || null,
      client_name: clientName,
      client_address: clientAddress || null,
      client_country: clientCountry || null,
      client_vat: clientVat || null,
      client_email: clientEmail || null,
      issue_date: issueDate,
      service_date: serviceDate || null,
      due_date: dueDate || null,
      language,
      line_items: items.filter(i => i.description.trim()),
      tax_rate: effectiveTaxRate,
      notes: notes || null,
    }

    try {
      const res = await fetch('/api/accounting/documents', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: doc!.id, ...payload } : payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Speichern fehlgeschlagen.')
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
        className="bg-panel w-full sm:max-w-2xl rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">
            {isEdit ? 'Bearbeiten' : docType === 'invoice' ? 'Neue Rechnung' : 'Neues Angebot'}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {/* Language toggle */}
            <div className="flex bg-dark rounded-lg p-0.5">
              {(['de', 'en'] as DocLanguage[]).map(l => (
                <button
                  key={l} type="button" onClick={() => setLanguage(l)}
                  className={`px-2.5 py-1 rounded-md text-xs font-black transition-all ${
                    language === l ? 'bg-accent text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Number + dates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Nummer</label>
              <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{docType === 'invoice' ? 'Rechnungsdatum' : 'Angebotsdatum'}</label>
              <DatePicker value={issueDate} onChange={setIssueDate} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Leistungsdatum</label>
              <DatePicker value={serviceDate} onChange={setServiceDate} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{docType === 'invoice' ? 'Fällig bis' : 'Gültig bis'}</label>
              <DatePicker value={dueDate} onChange={setDueDate} className={inputCls} />
            </div>
          </div>

          {/* Customer picker */}
          {customers.length > 0 && (
            <div>
              <label className={labelCls}>Gespeicherter Kunde übernehmen</label>
              <div className="relative">
                <select
                  value={customerId}
                  onChange={e => applyCustomer(e.target.value)}
                  className={`${inputCls} appearance-none pr-9`}
                >
                  <option value="">— Manuell eingeben —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kunde / Empfänger</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Firma oder Name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>E-Mail</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="kunde@firma.at" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Adresse</label>
            <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Straße Nr., PLZ Ort" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Land</label>
              <input type="text" value={clientCountry} onChange={e => setClientCountry(e.target.value)} placeholder="Österreich" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>UID / Firmenbuchnr.</label>
              <input type="text" value={clientVat} onChange={e => setClientVat(e.target.value)} placeholder="ATU00000000" className={inputCls} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className={labelCls}>Positionen</label>
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="bg-dark rounded-2xl p-3.5 relative">
                  <button
                    type="button" onClick={() => removeItem(idx)}
                    title="Position entfernen"
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-white/25 hover:text-accent hover:bg-accent/10 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                  <div className="grid grid-cols-2 sm:grid-cols-[1fr_70px_90px_100px] gap-2.5 pr-9">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-white/25 mb-1">Leistung</label>
                      <input
                        type="text" value={item.description}
                        onChange={e => updateItem(idx, { description: e.target.value })}
                        placeholder="Beschreibung"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wide text-white/25 mb-1">Anzahl</label>
                      <input
                        type="number" value={item.qty} min={0} step="any"
                        onChange={e => updateItem(idx, { qty: parseFloat(e.target.value) || 0 })}
                        onFocus={selectAllOnFocus}
                        className={`${inputCls} text-right`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wide text-white/25 mb-1">Laufzeit</label>
                      <input
                        type="text" value={item.duration ?? ''}
                        onChange={e => updateItem(idx, { duration: e.target.value })}
                        placeholder="optional"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wide text-white/25 mb-1">Preis (€)</label>
                      <input
                        type="number" value={item.unit_price} min={0} step="any"
                        onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                        onFocus={selectAllOnFocus}
                        className={`${inputCls} text-right`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={addItem}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={3} />Position hinzufügen
            </button>
          </div>

          {/* Tax + totals */}
          <div className="bg-dark rounded-2xl p-4 space-y-2">
            {smallBusiness ? (
              <p className="text-xs text-white/30 font-medium pb-1">Kleinunternehmer — keine USt. gemäß § 6 Abs. 1 Z 27 UStG.</p>
            ) : taxAdded ? (
              <div className="flex items-center justify-between">
                <button type="button" onClick={removeTax} className="text-xs font-bold text-white/30 hover:text-accent transition-all">
                  USt.-Satz (%) entfernen
                </button>
                <input
                  type="number" value={taxRate} min={0} max={100} step="any"
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  onFocus={selectAllOnFocus}
                  className="w-20 bg-panel rounded-lg px-2.5 py-1.5 text-sm text-white text-right outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ) : (
              <button
                type="button" onClick={addTax}
                className="flex items-center gap-1.5 text-xs font-black text-accent hover:text-accent-hover transition-all"
              >
                <Plus size={13} strokeWidth={3} />USt. hinzufügen
              </button>
            )}
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>Zwischensumme</span><span>{fmtMoney(subtotal)}</span>
            </div>
            {!smallBusiness && taxAdded && (
              <div className="flex items-center justify-between text-sm text-white/50">
                <span>USt. ({taxRate}%)</span><span>{fmtMoney(tax)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm font-black text-white">Gesamtbetrag</span>
              <span className="text-sm font-black text-accent">{fmtMoney(total)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notizen</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Zahlungsbedingungen, Hinweise..."
              className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button
            onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            <Save size={14} />
            {saving ? 'Speichern…' : 'Speichern & PDF erstellen'}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
