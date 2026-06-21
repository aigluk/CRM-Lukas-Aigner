'use client'

import { useState } from 'react'
import { X, Loader2, Phone, Trash2 } from 'lucide-react'
import { Lead } from '@/lib/types'
import { DatePicker, TimePicker } from '@/components/ui/DateTimePicker'

interface Props {
  lead: Lead
  onClose: () => void
  onSaved: (updated: Lead) => void
  onRemoved: (id: string) => void
}

export function AppointmentEditModal({ lead, onClose, onSaved, onRemoved }: Props) {
  const [date,  setDate]  = useState(lead.appointment_date ?? '')
  const [from,  setFrom]  = useState(lead.appointment_from ?? '10:00')
  const [to,    setTo]    = useState(lead.appointment_to   ?? '11:00')
  const [notes, setNotes] = useState(lead.notes ?? lead.note ?? '')
  const [saving,   setSaving]   = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error,    setError]    = useState('')

  async function save() {
    if (!date) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          appointment_date: date,
          appointment_from: from,
          appointment_to:   to,
          notes:            notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`)
      onSaved(data.lead)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setRemoving(true); setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          appointment_date: null,
          appointment_from: null,
          appointment_to:   null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`)
      onRemoved(lead.id)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        className="bg-panel rounded-2xl w-full max-w-sm p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-base font-black text-white leading-snug truncate">{lead.name}</h2>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1 text-xs text-white/35 hover:text-accent transition-colors mt-1"
              >
                <Phone size={11} />{lead.phone}
              </a>
            )}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <DatePicker label="Datum *" value={date} onChange={setDate} />

          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Von" value={from} onChange={setFrom} />
            <TimePicker label="Bis" value={to}   onChange={setTo}   />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/35 mb-1.5">Notizen</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional…"
              className="w-full bg-dark rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
            />
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button
            onClick={save}
            disabled={saving || !date}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all mt-1"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" />Speichert…</> : 'Termin speichern'}
          </button>

          <button
            onClick={remove}
            disabled={removing}
            className="w-full flex items-center justify-center gap-2 text-white/30 hover:text-accent text-xs font-bold py-2 transition-colors"
          >
            {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Termin entfernen
          </button>
        </div>
      </div>
    </div>
  )
}
