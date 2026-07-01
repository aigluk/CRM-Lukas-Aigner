'use client'

import { useState } from 'react'
import { X, Save, Plus, Pencil, Trash2, Check } from 'lucide-react'
import type { AccountingSubscription, SubscriptionInterval, PriceHistoryEntry } from '@/lib/types'
import { DatePicker } from './DatePicker'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'
const numCls = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const INTERVAL_LABELS: Record<SubscriptionInterval, string> = {
  monthly: 'Monatlich',
  quarterly: 'Quartal',
  yearly: 'Jährlich',
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function SubscriptionModal({
  subscription, onClose, onSaved,
}: { subscription?: AccountingSubscription; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!subscription

  const [name, setName]         = useState(subscription?.name ?? '')
  const [interval, setInterval] = useState<SubscriptionInterval>(subscription?.interval ?? 'monthly')
  const [startDate, setStartDate] = useState(subscription?.start_date ?? new Date().toISOString().slice(0, 10))
  const [amount, setAmount]     = useState(subscription ? String(subscription.amount) : '')

  // Price history (edit mode only)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>(subscription?.price_history ?? [])

  // Add new price change form
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [newPriceAmt, setNewPriceAmt]   = useState('')
  const [newPriceFrom, setNewPriceFrom] = useState(new Date().toISOString().slice(0, 10))
  const [newPriceNote, setNewPriceNote] = useState('')

  // Edit existing price entry
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editEntryAmt, setEditEntryAmt]     = useState('')
  const [editEntryFrom, setEditEntryFrom]   = useState('')
  const [editEntryNote, setEditEntryNote]   = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function save() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!name.trim()) { setError('Name fehlt.'); return }
    if (!amt || amt <= 0) { setError('Betrag fehlt.'); return }
    setSaving(true)
    setError('')

    try {
      const body = { name: name.trim(), amount: amt, interval, start_date: startDate, active: true }
      const res = isEdit
        ? await fetch('/api/accounting/subscriptions', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: subscription!.id, ...body }),
          })
        : await fetch('/api/accounting/subscriptions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Speichern fehlgeschlagen.')
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function addPriceChange() {
    const amt = parseFloat(newPriceAmt.replace(',', '.'))
    if (!amt || amt <= 0 || !newPriceFrom) return
    setSaving(true)
    try {
      const res = await fetch('/api/accounting/subscriptions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subscription!.id,
          price_change: { effective_from: newPriceFrom, amount: amt, note: newPriceNote || undefined },
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Fehler')
      const data = await res.json()
      setPriceHistory(data.subscription?.price_history ?? [])
      setAmount(String(amt))
      setShowAddPrice(false)
      setNewPriceAmt('')
      setNewPriceNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveEditEntry() {
    const amt = parseFloat(editEntryAmt.replace(',', '.'))
    if (!amt || !editEntryFrom || !editingEntryId) return
    setSaving(true)
    try {
      const res = await fetch('/api/accounting/subscriptions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subscription!.id,
          edit_price_entry: { id: editingEntryId, effective_from: editEntryFrom, amount: amt, note: editEntryNote || undefined },
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Fehler')
      const data = await res.json()
      setPriceHistory(data.subscription?.price_history ?? [])
      setAmount(String(data.subscription?.amount ?? amt))
      setEditingEntryId(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(entryId: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/accounting/subscriptions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subscription!.id, delete_price_entry_id: entryId }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Fehler')
      const data = await res.json()
      setPriceHistory(data.subscription?.price_history ?? [])
      setAmount(String(data.subscription?.amount ?? amount))
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
      <div className="bg-panel w-full sm:max-w-md rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">{isEdit ? 'Abo bearbeiten' : 'Neues Abo'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Adobe Creative Cloud" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Aktueller Betrag (€)</label>
              <input type="text" inputMode="decimal" value={amount}
                onChange={e => { if (/^[0-9]*[.,]?[0-9]*$/.test(e.target.value)) setAmount(e.target.value) }}
                placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Start</label>
              <DatePicker value={startDate} onChange={setStartDate} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Abrechnung</label>
            <div className="flex gap-2">
              {(Object.keys(INTERVAL_LABELS) as SubscriptionInterval[]).map(i => (
                <button key={i} type="button" onClick={() => setInterval(i)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    interval === i ? 'bg-accent text-white' : 'bg-panel-hover text-white/40 hover:text-white'
                  }`}>
                  {INTERVAL_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Price history (edit mode) */}
          {isEdit && (
            <div className="bg-dark rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white/40">Preisverlauf</span>
                <button type="button" onClick={() => { setShowAddPrice(v => !v); setNewPriceAmt(''); setNewPriceNote('') }}
                  className="flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover transition-all">
                  <Plus size={11} />Preisänderung
                </button>
              </div>

              {priceHistory.length === 0 && (
                <p className="text-xs text-white/25 italic">Noch kein Preisverlauf — wird beim ersten Speichern angelegt.</p>
              )}

              {[...priceHistory].sort((a, b) => a.effective_from.localeCompare(b.effective_from)).map(entry => (
                <div key={entry.id} className="rounded-lg bg-panel px-3 py-2">
                  {editingEntryId === entry.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={editEntryAmt} onChange={e => setEditEntryAmt(e.target.value)}
                          placeholder="Betrag" className={`${inputCls} ${numCls} text-xs py-1.5 px-2.5`} />
                        <DatePicker value={editEntryFrom} onChange={setEditEntryFrom} className={`${inputCls} text-xs py-1.5 px-2.5`} />
                      </div>
                      <input type="text" value={editEntryNote} onChange={e => setEditEntryNote(e.target.value)}
                        placeholder="Notiz (optional)" className={`${inputCls} text-xs py-1.5 px-2.5`} />
                      <div className="flex gap-1.5">
                        <button type="button" onClick={saveEditEntry} disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1 bg-accent text-white text-xs font-bold py-1.5 rounded-lg transition-all">
                          <Check size={11} />Speichern
                        </button>
                        <button type="button" onClick={() => setEditingEntryId(null)}
                          className="px-3 bg-panel-hover text-white/40 text-xs font-bold py-1.5 rounded-lg">Abbruch</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white">
                          {entry.amount.toLocaleString('de-AT', { minimumFractionDigits: 2 })} €
                        </span>
                        <span className="text-xs text-white/35 ml-2">ab {fmtDate(entry.effective_from)}</span>
                        {entry.note && <p className="text-[10px] text-white/25 mt-0.5">{entry.note}</p>}
                      </div>
                      <button type="button" onClick={() => {
                        setEditingEntryId(entry.id)
                        setEditEntryAmt(String(entry.amount))
                        setEditEntryFrom(entry.effective_from)
                        setEditEntryNote(entry.note ?? '')
                      }} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-all">
                        <Pencil size={10} />
                      </button>
                      {priceHistory.length > 1 && (
                        <button type="button" onClick={() => deleteEntry(entry.id)} disabled={saving}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-accent hover:bg-accent/10 transition-all">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {showAddPrice && (
                <div className="rounded-lg bg-panel px-3 py-2.5 space-y-2 border border-accent/30">
                  <p className="text-xs font-bold text-white/50">Neuer Preis</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={newPriceAmt} onChange={e => setNewPriceAmt(e.target.value)}
                      placeholder="Betrag (€)" className={`${inputCls} ${numCls} text-xs py-1.5 px-2.5`} />
                    <DatePicker value={newPriceFrom} onChange={setNewPriceFrom} className={`${inputCls} text-xs py-1.5 px-2.5`} />
                  </div>
                  <input type="text" value={newPriceNote} onChange={e => setNewPriceNote(e.target.value)}
                    placeholder="Notiz (optional)" className={`${inputCls} text-xs py-1.5 px-2.5`} />
                  <button type="button" onClick={addPriceChange} disabled={saving || !newPriceAmt || !newPriceFrom}
                    className="w-full flex items-center justify-center gap-1 bg-accent text-white text-xs font-bold py-1.5 rounded-lg disabled:opacity-50 transition-all">
                    <Plus size={11} />Hinzufügen
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]">
            <Save size={14} />
            {saving ? 'Speichern…' : 'Abo speichern'}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
