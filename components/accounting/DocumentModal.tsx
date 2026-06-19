'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Save } from 'lucide-react'
import type { AccountingDocument, DocType, LineItem } from '@/lib/types'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

function emptyItem(): LineItem {
  return { description: '', qty: 1, unit_price: 0 }
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
  const [docNumber, setDocNumber]   = useState(doc?.doc_number ?? nextNumberHint ?? '')
  const [clientName, setClientName] = useState(doc?.client_name ?? '')
  const [clientAddress, setClientAddress] = useState(doc?.client_address ?? '')
  const [clientEmail, setClientEmail] = useState(doc?.client_email ?? '')
  const [issueDate, setIssueDate]   = useState(doc?.issue_date ?? new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate]       = useState(doc?.due_date ?? '')
  const [taxRate, setTaxRate]       = useState(doc?.tax_rate ?? 20)
  const [notes, setNotes]           = useState(doc?.notes ?? '')
  const [items, setItems]           = useState<LineItem[]>(doc?.line_items?.length ? doc.line_items : [emptyItem()])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const subtotal = items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

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
      client_name: clientName,
      client_address: clientAddress || null,
      client_email: clientEmail || null,
      issue_date: issueDate,
      due_date: dueDate || null,
      line_items: items.filter(i => i.description.trim()),
      tax_rate: taxRate,
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
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Number + dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Nummer</label>
              <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{docType === 'invoice' ? 'Rechnungsdatum' : 'Angebotsdatum'}</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{docType === 'invoice' ? 'Fällig bis' : 'Gültig bis'}</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>

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

          {/* Line items */}
          <div>
            <label className={labelCls}>Positionen</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    type="text" value={item.description}
                    onChange={e => updateItem(idx, { description: e.target.value })}
                    placeholder="Beschreibung"
                    className={`${inputCls} flex-1`}
                  />
                  <input
                    type="number" value={item.qty} min={0} step="any"
                    onChange={e => updateItem(idx, { qty: parseFloat(e.target.value) || 0 })}
                    placeholder="Menge"
                    className={`${inputCls} w-20`}
                  />
                  <input
                    type="number" value={item.unit_price} min={0} step="any"
                    onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                    placeholder="Preis"
                    className={`${inputCls} w-24`}
                  />
                  <button
                    type="button" onClick={() => removeItem(idx)}
                    className="p-2.5 text-white/20 hover:text-accent transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white transition-colors mt-2"
            >
              <Plus size={13} />Position hinzufügen
            </button>
          </div>

          {/* Tax + totals */}
          <div className="bg-dark rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/30">USt.-Satz (%)</label>
              <input
                type="number" value={taxRate} min={0} max={100} step="any"
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-20 bg-panel rounded-lg px-2.5 py-1.5 text-sm text-white text-right outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>Zwischensumme</span><span>{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>USt. ({taxRate}%)</span><span>{fmtMoney(tax)}</span>
            </div>
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
