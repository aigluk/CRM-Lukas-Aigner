'use client'

import { useState } from 'react'
import { X, Save, BellRing, Trash2 } from 'lucide-react'
import type { AccountingPartner } from '@/lib/types'
import { addReminder } from '@/lib/useReminders'
import { DatePicker, TimePicker } from '@/components/ui/DateTimePicker'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

export function PartnerModal({
  partner, onClose, onSaved,
}: {
  partner?: AccountingPartner
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!partner
  const [name, setName] = useState(partner?.name ?? '')
  const [contactPerson, setContactPerson] = useState(partner?.contact_person ?? '')
  const [address, setAddress] = useState(partner?.address ?? '')
  const [country, setCountry] = useState(partner?.country ?? '')
  const [vatNumber, setVatNumber] = useState(partner?.vat_number ?? '')
  const [vatLiable, setVatLiable] = useState(partner?.vat_liable ?? true)
  const [email, setEmail] = useState(partner?.email ?? '')
  const [phone, setPhone] = useState(partner?.phone ?? '')
  const [website, setWebsite] = useState(partner?.website ?? '')
  const [notes, setNotes] = useState(partner?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [reminderText, setReminderText] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('09:00')

  function saveReminder() {
    if (!reminderText.trim() || !partner?.id) return
    addReminder({
      refType: 'partner',
      refId: partner.id,
      refName: partner.name,
      text: reminderText.trim(),
      manual: true,
      remindAt: reminderDate ? new Date(`${reminderDate}T${reminderTime}:00`).toISOString() : undefined,
    })
    setReminderText('')
    setReminderDate('')
    setReminderTime('09:00')
    setShowReminder(false)
  }

  async function handleDelete() {
    if (!partner?.id || deleting) return
    if (!confirm(`"${partner.name}" wirklich löschen?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/accounting/partners?id=${partner.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen.')
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setDeleting(false)
    }
  }

  async function save() {
    if (!name.trim()) { setError('Name ist erforderlich.'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: name.trim(),
      contact_person: contactPerson || null,
      address: address || null,
      country: country || null,
      vat_number: vatNumber || null,
      vat_liable: vatLiable,
      email: email || null,
      phone: phone || null,
      website: website || null,
      notes: notes || null,
    }

    try {
      const res = await fetch('/api/accounting/partners', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: partner!.id, ...payload } : payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen.')

      const originalNotes = partner?.notes ?? ''
      if (notes.trim() && notes.trim() !== originalNotes.trim()) {
        const id = partner?.id ?? data.partner?.id
        if (id) addReminder({ refType: 'partner', refId: id, refName: name.trim(), text: notes.trim() })
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
        className="bg-panel w-full sm:max-w-lg rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white flex-1 truncate">{isEdit ? 'Partner bearbeiten' : 'Neuer Partner'}</h2>
          {isEdit && (
            <button
              onClick={() => setShowReminder(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                showReminder ? 'bg-accent text-white' : 'bg-panel-hover text-white/40 hover:text-white'
              }`}
            >
              <BellRing size={12} />Erinnerung hinzufügen
            </button>
          )}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Partner löschen"
              className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-accent transition-all shrink-0 disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {showReminder && (
            <div className="bg-dark rounded-2xl p-4 space-y-3">
              <textarea
                value={reminderText}
                onChange={e => setReminderText(e.target.value)}
                placeholder="Worüber soll erinnert werden?"
                rows={2}
                className={`${inputCls} resize-none`}
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker value={reminderDate} onChange={setReminderDate} />
                </div>
                <div className="flex-1">
                  <TimePicker value={reminderTime} onChange={setReminderTime} />
                </div>
                <button
                  onClick={saveReminder}
                  disabled={!reminderText.trim()}
                  className="px-4 py-2.5 bg-accent text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40 shrink-0"
                >
                  Speichern
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name / Agentur</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Partneragentur GmbH" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ansprechperson</label>
              <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Max Mustermann" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Adresse (mehrzeilig)</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
              placeholder={'Bsp Adresse / 5330 XYZ'} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Land</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Österreich" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Webseite</label>
              <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.agentur.at" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>UID / Firmenbuchnr.</label>
              <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="ATU00000000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Umsatzsteuerpflichtig</label>
              <div className="flex bg-dark rounded-xl p-1">
                <button
                  type="button" onClick={() => setVatLiable(true)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${vatLiable ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
                >Ja</button>
                <button
                  type="button" onClick={() => setVatLiable(false)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${!vatLiable ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
                >Nein</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="kontakt@agentur.at" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+43 ..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notizen</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Interne Notizen..." className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button
            onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            <Save size={14} />
            {saving ? 'Speichern…' : 'Partner speichern'}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
