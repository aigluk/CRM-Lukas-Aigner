'use client'

import { useState } from 'react'
import { Lead, LeadStatus } from '@/lib/types'
import { STATUSES, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'
import { formatDate, formatRelativeDateTime } from '@/lib/utils'
import {
  X, Edit3, Save, Trash2, Phone, Mail, Globe,
  MapPin, User, Building2, FileText, Calendar,
  ExternalLink, CheckSquare, Square, Zap, Plus, Tag,
} from 'lucide-react'
import { DatePicker, TimePicker } from '@/components/ui/DateTimePicker'

const CALL_ITEMS = [
  'Unterlagen schicken',
  'Follow-Up-Mail',
  'Beispiele schicken',
  'Referenzen',
  'Website / Daten teilen',
]

function Field({
  label, icon, value, editing, onChange, href, type = 'text',
}: {
  label: string; icon: React.ReactNode; value: string
  editing: boolean; onChange: (v: string) => void; href?: string; type?: string
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-white/25 mb-1.5">
        {icon}{label}
      </label>
      {editing ? (
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-dark rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-accent transition-all"
        />
      ) : href && value ? (
        <a href={href} target={type !== 'tel' && type !== 'email' ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1.5 group"
        >
          <span className="truncate">{value}</span>
          {type !== 'tel' && type !== 'email' && (
            <ExternalLink size={11} className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
          )}
        </a>
      ) : (
        <p className="text-sm text-white/50">{value || '—'}</p>
      )}
    </div>
  )
}

export function LeadDetailModal({
  lead, onClose, onUpdate, onDelete, branches = [],
}: {
  lead: Lead
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  branches?: string[]
}) {
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState<Partial<Lead>>({ ...lead })
  const [saving, setSaving]       = useState(false)
  const [callMode, setCallMode]   = useState(false)
  const [checked, setChecked]     = useState<Set<string>>(new Set())
  const [quickNote, setQuickNote] = useState('')
  const [showAppt, setShowAppt]   = useState(false)
  const [editAppt, setEditAppt]   = useState(!!lead.appointment_date)

  function set<K extends keyof Lead>(field: K, value: Lead[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleCheck(item: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  async function save() {
    setSaving(true)
    let finalNotes = form.notes ?? ''
    if (callMode && (checked.size > 0 || quickNote.trim())) {
      const ts = new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })
      const items = Array.from(checked).map(i => `✓ ${i}`).join(', ')
      const note  = quickNote.trim()
      const line  = `[${ts}] Nachfolge: ${[items, note].filter(Boolean).join(' — ')}`
      finalNotes = finalNotes ? `${finalNotes}\n${line}` : line
    }
    await onUpdate(lead.id, { ...form, notes: finalNotes })
    setSaving(false)
    setEditing(false)
    setCallMode(false)
    setChecked(new Set())
    setQuickNote('')
  }

  async function handleDelete() {
    if (!confirm(`"${lead.name}" wirklich löschen?`)) return
    await onDelete(lead.id)
  }

  function bookAppointment() {
    if (!form.appointment_date) return
    set('status', 'VERKAUFSGESPRÄCH')
    setShowAppt(false)
    setEditing(true)
  }

  const sc = STATUS_COLORS[lead.status]

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-panel w-full sm:max-w-2xl rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >

        {/* Header — two-row on mobile so buttons never crush the title */}
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle">
          {/* Row 1: title + close */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-white truncate">{lead.name}</h2>
              <p className="text-xs text-white/35 mt-0.5 truncate">
                {[lead.branche || lead.industry, lead.city || lead.region].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all shrink-0">
              <X size={16} />
            </button>
          </div>
          {/* Row 2: actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCallMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                callMode ? 'bg-accent text-white' : 'bg-panel-hover text-white/40 hover:text-white'
              }`}
            >
              <Zap size={12} />Im Call
            </button>
            {editing ? (
              <>
                <button
                  onClick={save} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60"
                >
                  <Save size={12} />{saving ? '…' : 'Speichern'}
                </button>
                <button
                  onClick={() => { setForm({ ...lead }); setEditAppt(!!lead.appointment_date); setEditing(false) }}
                  className="px-3 py-1.5 bg-panel-hover text-white/40 hover:text-white text-xs font-bold rounded-xl transition-all"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <button
                onClick={() => { setForm({ ...lead }); setEditAppt(!!lead.appointment_date); setEditing(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-panel-hover text-white/40 hover:text-white text-xs font-bold rounded-xl transition-all"
              >
                <Edit3 size={12} />Bearbeiten
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* IM CALL PANEL */}
          {callMode && (
            <div className="bg-dark rounded-2xl p-5 space-y-4">
              <p className="text-xs font-black text-accent">Schnellaktionen</p>
              <ul className="space-y-2">
                {CALL_ITEMS.map(item => {
                  const done = checked.has(item)
                  return (
                    <li key={item}>
                      <button
                        onClick={() => toggleCheck(item)}
                        className="flex items-center gap-3 w-full group"
                      >
                        {done
                          ? <CheckSquare size={16} className="text-accent-green shrink-0" />
                          : <Square size={16} className="text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />
                        }
                        <span className={`text-sm transition-colors ${done ? 'text-white/40 line-through' : 'text-white/80'}`}>
                          {item}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <textarea
                value={quickNote}
                onChange={e => setQuickNote(e.target.value)}
                placeholder="Notiz aus dem Call..."
                rows={2}
                className="w-full bg-panel rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
              />
              {/* Termin anlegen */}
              {!showAppt ? (
                <button
                  onClick={() => setShowAppt(true)}
                  className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white transition-colors"
                >
                  <Plus size={13} />
                  Termin anlegen
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white/30">Termin</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3 sm:col-span-1">
                      <DatePicker value={form.appointment_date ?? ''} onChange={v => set('appointment_date', v)} />
                    </div>
                    <TimePicker value={form.appointment_from ?? '10:00'} onChange={v => set('appointment_from', v)} />
                    <TimePicker value={form.appointment_to ?? '11:00'} onChange={v => set('appointment_to', v)} />
                  </div>
                  <button
                    onClick={bookAppointment}
                    className="w-full bg-accent text-white text-sm font-bold py-2.5 rounded-xl transition-all hover:bg-accent-hover active:scale-[0.98]"
                  >
                    Termin fixieren
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-white/30 mb-2">Status</label>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => set('status', s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      (form.status ?? lead.status) === s
                        ? 'bg-accent text-white'
                        : 'bg-panel-hover text-white/40 hover:text-white'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={`h-8 inline-flex items-center px-3 rounded-full text-xs font-bold whitespace-nowrap ${sc.bg} ${sc.text}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
                {lead.status_date && (
                  <span className="text-xs text-white/25">seit {formatDate(lead.status_date)}</span>
                )}
              </div>
            )}
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Unternehmen" icon={<Building2 size={11} />}
              value={form.name ?? ''} editing={editing} onChange={v => set('name', v)} />
            <Field label="Ansprechpartner" icon={<User size={11} />}
              value={form.ceos ?? form.owner ?? ''} editing={editing} onChange={v => set('ceos', v)} />
            <Field label="Telefon" icon={<Phone size={11} />}
              value={form.phone ?? ''} editing={editing} onChange={v => set('phone', v)}
              href={lead.phone ? `tel:${lead.phone}` : undefined} type="tel" />
            <Field label="E-Mail" icon={<Mail size={11} />}
              value={form.email ?? form.email_general ?? ''} editing={editing} onChange={v => set('email', v)}
              href={lead.email || lead.email_general ? `mailto:${lead.email || lead.email_general}` : undefined} type="email" />
            <Field label="Adresse" icon={<MapPin size={11} />}
              value={form.address ?? form.region ?? ''} editing={editing} onChange={v => set('address', v)} />
            <Field label="Website" icon={<Globe size={11} />}
              value={form.website ?? ''} editing={editing} onChange={v => set('website', v)}
              href={lead.website} type="url" />

            {/* Branche — editable with datalist suggestions */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/25 mb-1.5">
                <Tag size={11} />Branche
              </label>
              {editing ? (
                <>
                  <input
                    type="text"
                    value={form.branche ?? ''}
                    onChange={e => set('branche', e.target.value as Lead['branche'])}
                    list="branche-suggestions"
                    placeholder="z. B. Photovoltaik"
                    className="w-full bg-dark rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-accent transition-all"
                  />
                  <datalist id="branche-suggestions">
                    {branches.map(b => <option key={b} value={b} />)}
                  </datalist>
                </>
              ) : (
                <p className="text-sm text-white/50">{lead.branche || '—'}</p>
              )}
            </div>
          </div>

          {/* Last edited */}
          {lead.updated_at && (
            <p className="text-xs text-white/20 font-medium">
              Zuletzt bearbeitet: {formatRelativeDateTime(lead.updated_at)}
            </p>
          )}

          {/* Appointment — view mode */}
          {!callMode && !editing && lead.appointment_date && (
            <div className="bg-dark rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-accent">
                  <Calendar size={11} />Termin
                </label>
                <button
                  onClick={() => onUpdate(lead.id, { appointment_date: '', appointment_from: '', appointment_to: '' })}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-accent transition-colors font-bold"
                >
                  <X size={11} /> Termin löschen
                </button>
              </div>
              <p className="text-sm font-bold text-white">{formatDate(lead.appointment_date)}</p>
              {lead.appointment_from && (
                <p className="text-xs text-white/40 mt-1">
                  {lead.appointment_from}{lead.appointment_to ? ` – ${lead.appointment_to}` : ''} Uhr
                </p>
              )}
            </div>
          )}

          {/* Appointment — edit mode */}
          {!callMode && editing && (
            <div className="bg-dark rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-accent">
                  <Calendar size={11} />Termin
                </label>
                {editAppt && (
                  <button
                    onClick={() => { setEditAppt(false); set('appointment_date', ''); set('appointment_from', ''); set('appointment_to', '') }}
                    className="flex items-center gap-1 text-xs text-white/30 hover:text-accent transition-colors font-bold"
                  >
                    <X size={11} /> Entfernen
                  </button>
                )}
              </div>
              {editAppt ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3 sm:col-span-1">
                    <DatePicker value={form.appointment_date ?? ''} onChange={v => set('appointment_date', v)} />
                  </div>
                  <TimePicker value={form.appointment_from ?? '10:00'} onChange={v => set('appointment_from', v)} />
                  <TimePicker value={form.appointment_to ?? '11:00'} onChange={v => set('appointment_to', v)} />
                </div>
              ) : (
                <button
                  onClick={() => setEditAppt(true)}
                  className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white transition-colors"
                >
                  <Plus size={13} />Termin festlegen
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-white/25 mb-2">
              <FileText size={11} />Notizen
            </label>
            {editing ? (
              <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={4}
                className="w-full bg-dark rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
                placeholder="Gesprächsverlauf, Beobachtungen..." />
            ) : (
              <p className="text-sm text-white/50 whitespace-pre-wrap leading-relaxed min-h-5">{form.notes || lead.notes || '—'}</p>
            )}
          </div>

          {/* Deal Note */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-white/25 mb-2">
              <FileText size={11} />Deal Note
            </label>
            {editing ? (
              <textarea value={form.note ?? ''} onChange={e => set('note', e.target.value)} rows={2}
                className="w-full bg-dark rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
                placeholder="Angebotsbetrag, Deal-Details..." />
            ) : (
              <p className="text-sm text-white/50 min-h-5">{lead.note || '—'}</p>
            )}
          </div>

          {/* Delete */}
          <div className="pt-4">
            <button onClick={handleDelete}
              className="flex items-center gap-2 text-xs text-white/20 hover:text-accent transition-colors font-bold"
            >
              <Trash2 size={13} />
              Lead löschen
            </button>
          </div>

          {/* Safe-area bottom spacer — always clears home indicator */}
          <div style={{ height: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }} />
        </div>
      </div>
    </div>
  )
}
