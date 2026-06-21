'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { AccountingSubscription, SubscriptionInterval } from '@/lib/types'
import { DatePicker } from './DatePicker'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

const INTERVAL_LABELS: Record<SubscriptionInterval, string> = {
  monthly: 'Monatlich',
  quarterly: 'Quartal',
  yearly: 'Jährlich',
}

export function SubscriptionModal({
  subscription, onClose, onSaved,
}: { subscription?: AccountingSubscription; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(subscription?.name ?? '')
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : '')
  const [interval, setInterval] = useState<SubscriptionInterval>(subscription?.interval ?? 'monthly')
  const [startDate, setStartDate] = useState(subscription?.start_date ?? new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!name.trim()) { setError('Name fehlt.'); return }
    if (!amt || amt <= 0) { setError('Betrag fehlt.'); return }
    setSaving(true)
    setError('')

    try {
      const body = { name: name.trim(), amount: amt, interval, start_date: startDate, active: true }
      const res = subscription
        ? await fetch('/api/accounting/subscriptions', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: subscription.id, ...body }),
          })
        : await fetch('/api/accounting/subscriptions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
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
    >
      <div
        className="bg-panel w-full sm:max-w-md rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">{subscription ? 'Abo bearbeiten' : 'Neues Abo'}</h2>
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
              <label className={labelCls}>Betrag (€)</label>
              <input
                type="text" inputMode="decimal" value={amount}
                onChange={e => { if (/^[0-9]*[.,]?[0-9]*$/.test(e.target.value)) setAmount(e.target.value) }}
                placeholder="0.00" className={inputCls}
              />
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
                <button
                  key={i} type="button" onClick={() => setInterval(i)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    interval === i ? 'bg-accent text-white' : 'bg-panel-hover text-white/40 hover:text-white'
                  }`}
                >
                  {INTERVAL_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button
            onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            <Save size={14} />
            {saving ? 'Speichern…' : 'Abo speichern'}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
