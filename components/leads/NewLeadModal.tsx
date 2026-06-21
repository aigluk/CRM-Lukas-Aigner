'use client'

import { useState } from 'react'
import { Lead, LeadStatus } from '@/lib/types'
import { STATUSES, STATUS_LABELS, BRANCHES } from '@/lib/constants'
import { X, Building2, User, Phone, Mail, Globe, MapPin, Tag, FileText, ChevronDown } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreate: (lead: Lead) => void
}

const EMPTY = {
  name: '',
  ceos: '',
  phone: '',
  email: '',
  website: '',
  branche: '',
  city: '',
  status: 'NEU' as LeadStatus,
  notes: '',
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-medium text-white/35 mb-1.5">
      {icon}{text}
    </label>
  )
}

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'

export function NewLeadModal({ onClose, onCreate }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof EMPTY, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Firmenname ist erforderlich.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const text = await res.text()
      let json: any = {}
      try { json = JSON.parse(text) } catch {}
      if (!res.ok) throw new Error(json.error || `Serverfehler ${res.status}`)
      onCreate(json.lead)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-panel w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl max-h-[94vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
          <div>
            <h2 className="text-base font-black text-white">Neuer Lead</h2>
            <p className="text-xs text-white/30 mt-0.5">Kontakt manuell erfassen</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-6 py-5 space-y-4">

          {/* Firma — required */}
          <div>
            <Label icon={<Building2 size={11} />} text="Firma *" />
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Musterunternehmen GmbH"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label icon={<User size={11} />} text="Ansprechpartner" />
              <input type="text" value={form.ceos} onChange={e => set('ceos', e.target.value)}
                placeholder="Max Mustermann" className={inputCls} />
            </div>
            <div>
              <Label icon={<Phone size={11} />} text="Telefon" />
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+43 664 123456" className={inputCls} />
            </div>
            <div>
              <Label icon={<Mail size={11} />} text="E-Mail" />
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="office@firma.at" className={inputCls} />
            </div>
            <div>
              <Label icon={<Globe size={11} />} text="Website" />
              <input type="url" value={form.website} onChange={e => set('website', e.target.value)}
                placeholder="https://firma.at" className={inputCls} />
            </div>
            <div className="relative">
              <Label icon={<Tag size={11} />} text="Branche" />
              <select
                value={form.branche}
                onChange={e => set('branche', e.target.value)}
                className="w-full bg-dark rounded-xl px-3.5 py-2.5 pr-9 text-sm text-white outline-none focus:ring-1 focus:ring-accent transition-all appearance-none"
              >
                <option value="">- Branche wählen -</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-[calc(50%+7px)] -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
            <div>
              <Label icon={<MapPin size={11} />} text="Stadt / Region" />
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                placeholder="Wien" className={inputCls} />
            </div>
          </div>

          {/* Status — all options */}
          <div>
            <Label icon={<Tag size={11} />} text="Status" />
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    form.status === s
                      ? 'bg-accent text-white'
                      : 'bg-panel-hover text-white/35 hover:text-white'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Notizen */}
          <div>
            <Label icon={<FileText size={11} />} text="Notizen" />
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Erster Kontakt, Gesprächsverlauf..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <p className="text-xs text-accent bg-accent/10 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent hover:bg-accent-hover text-white font-black text-sm py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? 'Wird gespeichert…' : 'Lead anlegen'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-panel-hover text-white/40 hover:text-white font-bold text-sm rounded-xl transition-all"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
