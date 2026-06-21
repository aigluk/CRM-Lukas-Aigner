'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Lead, LeadStatus } from '@/lib/types'
import { isSameDay, toDateInput } from '@/lib/utils'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'
import { ChevronLeft, ChevronRight, ChevronDown, Phone, Plus, X, Loader2 } from 'lucide-react'
import { DatePicker, TimePicker } from '@/components/ui/DateTimePicker'
import { AppointmentEditModal } from '@/components/ui/AppointmentEditModal'
import { TodayPanel } from '@/components/dashboard/TodayPanel'
import { ReminderWidget } from '@/components/dashboard/ReminderWidget'

type View = 'month' | 'week' | 'day'

const NON_PIPELINE_TYPES = ['KUNDENTERMIN', 'KUNDENCALL'] as const
type AppointmentKind = LeadStatus | typeof NON_PIPELINE_TYPES[number]
const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  ...STATUS_LABELS,
  KUNDENTERMIN: 'Kundentermin',
  KUNDENCALL: 'Kundencall',
}

function AppointmentKindPicker({ value, onChange }: { value: AppointmentKind; onChange: (v: AppointmentKind) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-medium text-white/35 mb-1.5">Status / Termin-Art</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-dark rounded-xl px-3.5 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-accent transition-all"
      >
        {APPOINTMENT_KIND_LABELS[value]}
        <ChevronDown size={14} className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-panel-hover rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 p-1 max-h-64 overflow-y-auto">
          {STATUSES.map(s => (
            <button
              key={s} type="button" onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2.5 text-sm rounded-lg hover:bg-white/8 transition-colors ${s === value ? 'text-accent font-bold' : 'text-white/70'}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          <div className="border-t border-white/8 my-1" />
          {NON_PIPELINE_TYPES.map(t => (
            <button
              key={t} type="button" onClick={() => { onChange(t); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2.5 text-sm rounded-lg hover:bg-white/8 transition-colors ${t === value ? 'text-accent font-bold' : 'text-white/70'}`}
            >
              {APPOINTMENT_KIND_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getAppointments(leads: Lead[]) {
  return leads
    .filter(l => l.appointment_date)
    .sort((a, b) => new Date(a.appointment_date!).getTime() - new Date(b.appointment_date!).getTime())
}

/* ── New Appointment Modal ── */
function NewAppointmentModal({
  initialDate, initialFrom, initialTo, onClose, onCreated,
}: {
  initialDate: string; initialFrom?: string; initialTo?: string
  onClose: () => void; onCreated: (lead: Lead) => void
}) {
  const [firma, setFirma] = useState('')
  const [date, setDate]   = useState(initialDate)
  const [from, setFrom]   = useState(initialFrom || '10:00')
  const [to, setTo]       = useState(initialTo || '11:00')
  const [notes, setNotes] = useState('')
  const [kind, setKind]   = useState<AppointmentKind>('VERKAUFSGESPRÄCH')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [existingLeads, setExistingLeads] = useState<Lead[]>([])
  const [suggestionPool, setSuggestionPool] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const firmaWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()).catch(() => ({})),
      fetch('/api/accounting/customers').then(r => r.json()).catch(() => ({})),
    ]).then(([leadsRes, customersRes]) => {
      const leadsList: Lead[] = leadsRes.leads ?? []
      setExistingLeads(leadsList)
      const names = new Set<string>()
      leadsList.forEach(l => { if (l.name?.trim()) names.add(l.name.trim()) })
      ;(customersRes.customers ?? []).forEach((c: { name: string }) => { if (c.name?.trim()) names.add(c.name.trim()) })
      setSuggestionPool(Array.from(names))
    })
  }, [])

  const matchedLead = useMemo(
    () => existingLeads.find(l => l.name.trim().toLowerCase() === firma.trim().toLowerCase()),
    [existingLeads, firma]
  )
  const isPipelineKind = (STATUSES as readonly string[]).includes(kind)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (firmaWrapRef.current && !firmaWrapRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const suggestions = useMemo(() => {
    const q = firma.trim().toLowerCase()
    if (!q) return []
    return suggestionPool.filter(n => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 6)
  }, [firma, suggestionPool])

  async function save() {
    if (!firma || !date) return
    setSaving(true)
    setError('')
    try {
      const appointmentFields = {
        appointment_date: date,
        appointment_from: from,
        appointment_to: to,
        appointment_type: isPipelineKind ? null : kind,
        ...(isPipelineKind ? { status: kind } : {}),
      }

      let res: Response
      if (matchedLead) {
        res = await fetch('/api/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: matchedLead.id,
            ...appointmentFields,
            notes: notes ? [matchedLead.notes, notes].filter(Boolean).join('\n') : undefined,
          }),
        })
      } else {
        res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: firma,
            status: isPipelineKind ? kind : 'NEU',
            ...appointmentFields,
            notes: notes || undefined,
          }),
        })
      }
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {}
      if (!res.ok) throw new Error(data.error || `Serverfehler ${res.status}`)
      onCreated(data.lead)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-panel rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-white">Neuer Termin</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div ref={firmaWrapRef} className="relative">
            <label className="block text-[11px] font-medium text-white/35 mb-1.5">Firma / Kunde *</label>
            <input
              autoFocus
              type="text"
              value={firma}
              onChange={e => { setFirma(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Musterfirma GmbH"
              autoComplete="off"
              className="w-full bg-dark rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-10 bg-panel-hover rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden">
                {suggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { setFirma(name); setShowSuggestions(false) }}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-white/80 hover:bg-white/8 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {matchedLead && (
              <p className="text-[11px] text-accent-green font-semibold mt-1.5">Bestehender Lead wird verwendet</p>
            )}
          </div>

          <AppointmentKindPicker value={kind} onChange={setKind} />

          <DatePicker label="Datum *" value={date} onChange={setDate} />

          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Von" value={from} onChange={setFrom} />
            <TimePicker label="Bis" value={to} onChange={setTo} />
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
            disabled={saving || !firma || !date}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all mt-1"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Speichert…</> : 'Termin anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CalendarView({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads]     = useState<Lead[]>(initialLeads)
  const [view, setView]       = useState<View>('month')
  const [current, setCurrent] = useState(new Date())
  const [modal, setModal]     = useState<{ date: string; from?: string; to?: string } | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const appointments          = useMemo(() => getAppointments(leads), [leads])

  function handleCreated(lead: Lead) {
    setLeads(prev => [lead, ...prev])
  }

  function handleSaved(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
  }

  function handleRemoved(id: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, appointment_date: undefined } : l))
  }

  function prev() {
    const d = new Date(current)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setCurrent(d)
  }
  function next() {
    const d = new Date(current)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setCurrent(d)
  }
  function goToday() { setCurrent(new Date()) }

  const title = (() => {
    if (view === 'month') return current.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })
    if (view === 'day')   return current.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })
    const s = new Date(current)
    s.setDate(current.getDate() - ((current.getDay() + 6) % 7))
    const e = new Date(s); e.setDate(s.getDate() + 6)
    return `${s.toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' })}`
  })()

  return (
    <div>
      {modal && (
        <NewAppointmentModal
          initialDate={modal.date}
          initialFrom={modal.from}
          initialTo={modal.to}
          onClose={() => setModal(null)}
          onCreated={handleCreated}
        />
      )}
      {editLead && (
        <AppointmentEditModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Kalender</h1>
          <p className="text-sm text-white/30 mt-2 font-medium capitalize">{title}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModal({ date: toDateInput(current) })}
            className="flex items-center gap-2 bg-accent hover:opacity-90 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
          >
            <Plus size={14} />
            Neuer Termin
          </button>
          <div className="flex bg-panel rounded-xl p-1 gap-0.5">
            {(['day', 'week', 'month'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  view === v ? 'bg-accent text-white' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {v === 'day' ? 'Tag' : v === 'week' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>
          <button onClick={goToday}
            className="px-3 py-1.5 text-xs font-bold text-white/40 hover:text-white bg-panel rounded-xl transition-all"
          >
            Heute
          </button>
          <button onClick={prev} className="p-2 text-white/30 hover:text-white hover:bg-panel rounded-xl transition-all">
            <ChevronLeft size={17} />
          </button>
          <button onClick={next} className="p-2 text-white/30 hover:text-white hover:bg-panel rounded-xl transition-all">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {view === 'month' ? (
            <MonthView
              current={current}
              appointments={appointments}
              onCreate={date => setModal({ date: toDateInput(date) })}
              onEdit={setEditLead}
            />
          ) : (
            <HourGrid
              days={view === 'day' ? [current] : weekDays(current)}
              appointments={appointments}
              onCreate={(date, from, to) => setModal({ date: toDateInput(date), from, to })}
              onEdit={setEditLead}
            />
          )}
        </div>
        <div className="lg:col-span-1 flex flex-col gap-5 lg:h-full">
          <div className="flex-1 min-h-60"><TodayPanel leads={leads} onEdit={setEditLead} /></div>
          <div className="flex-1 min-h-60"><ReminderWidget /></div>
        </div>
      </div>
    </div>
  )
}

function weekDays(current: Date) {
  const start = new Date(current)
  start.setDate(current.getDate() - ((current.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d
  })
}

/* ── Month View ── */
function MonthView({
  current, appointments, onCreate, onEdit,
}: { current: Date; appointments: Lead[]; onCreate: (d: Date) => void; onEdit: (l: Lead) => void }) {
  const today  = new Date()
  const year   = current.getFullYear()
  const month  = current.getMonth()
  const first  = new Date(year, month, 1)
  const last   = new Date(year, month + 1, 0)
  const startDay = (first.getDay() + 6) % 7
  const days: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))

  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/5">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-3 text-center text-[10px] font-black text-white/20 tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const appts   = d ? appointments.filter(l => l.appointment_date && isSameDay(new Date(l.appointment_date), d)) : []
          const isToday = d ? isSameDay(d, today) : false
          return (
            <div
              key={i}
              onDoubleClick={() => d && onCreate(d)}
              className={`min-h-24 p-2 border-b border-r border-white/4 ${!d ? 'bg-dark/30' : 'hover:bg-panel-hover transition-colors cursor-pointer'}`}
            >
              {d && (
                <>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mb-1 ${
                    isToday ? 'bg-accent text-white' : 'text-white/30'
                  }`}>
                    {d.getDate()}
                  </span>
                  {appts.map(l => (
                    <div
                      key={l.id}
                      onClick={e => { e.stopPropagation(); onEdit(l) }}
                      className="bg-accent hover:opacity-85 rounded-lg px-1.5 py-1 mb-1 cursor-pointer transition-opacity"
                    >
                      <p className="text-[10px] font-bold text-white truncate">{l.name}</p>
                      {l.appointment_from && (
                        <p className="text-[9px] text-white/60">{l.appointment_from}</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Hour Grid (Week / Day) — drag to create like Apple Calendar ── */
const HOURS  = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00–21:00
const ROW_H  = 52

function HourGrid({
  days, appointments, onCreate, onEdit,
}: { days: Date[]; appointments: Lead[]; onCreate: (d: Date, from: string, to: string) => void; onEdit: (l: Lead) => void }) {
  const today = new Date()
  const [drag, setDrag] = useState<{ col: number; startY: number; endY: number } | null>(null)
  const dragging = useRef(false)

  function yToTime(y: number) {
    const totalMin = Math.max(0, Math.round((y / ROW_H) * 60 / 15) * 15)
    const hour = 7 + Math.floor(totalMin / 60)
    const min  = totalMin % 60
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  function handleDown(col: number, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    dragging.current = true
    setDrag({ col, startY: y, endY: y })
  }
  function handleMove(col: number, e: React.MouseEvent) {
    if (!dragging.current || !drag || drag.col !== col) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    setDrag({ ...drag, endY: y })
  }
  function handleUp(col: number) {
    if (!dragging.current || !drag) return
    dragging.current = false
    const top    = Math.min(drag.startY, drag.endY)
    const bottom = Math.max(drag.startY, drag.endY)
    const day    = days[col]
    if (bottom - top < 10) {
      const from = yToTime(top)
      const [fh, fm] = from.split(':').map(Number)
      const to = `${String(fh + 1).padStart(2, '0')}:${String(fm).padStart(2, '0')}`
      onCreate(day, from, to)
    } else {
      onCreate(day, yToTime(top), yToTime(bottom))
    }
    setDrag(null)
  }

  const LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-white/5">
        <div className="w-12 shrink-0" />
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((d, i) => (
            <div key={i} className="py-3 text-center border-l border-white/4 first:border-l-0">
              {days.length > 1 && (
                <p className="text-[10px] font-black text-white/20 tracking-wide">{LABELS[(d.getDay() + 6) % 7]}</p>
              )}
              <p className={`text-sm font-bold mt-0.5 ${isSameDay(d, today) ? 'text-accent' : 'text-white/50'}`}>
                {d.getDate()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex select-none">
        <div className="w-12 shrink-0">
          {HOURS.map(h => (
            <div key={h} style={{ height: ROW_H }} className="text-[10px] text-white/20 font-bold text-right pr-2 pt-0.5">
              {h}:00
            </div>
          ))}
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((d, col) => {
            const dayAppts = appointments.filter(l => l.appointment_date && isSameDay(new Date(l.appointment_date), d))
            return (
              <div
                key={col}
                className="relative border-l border-white/4 first:border-l-0 cursor-pointer"
                onMouseDown={e => handleDown(col, e)}
                onMouseMove={e => handleMove(col, e)}
                onMouseUp={() => handleUp(col)}
              >
                {HOURS.map(h => (
                  <div key={h} style={{ height: ROW_H }} className="border-t border-white/4" />
                ))}

                {drag && drag.col === col && (
                  <div
                    className="absolute left-1 right-1 bg-accent/30 rounded-lg pointer-events-none"
                    style={{ top: Math.min(drag.startY, drag.endY), height: Math.abs(drag.endY - drag.startY) }}
                  />
                )}

                {dayAppts.map(l => {
                  const [fh, fm] = (l.appointment_from || '09:00').split(':').map(Number)
                  const top = ((fh - 7) * 60 + fm) / 60 * ROW_H
                  const [th, tm] = (l.appointment_to || `${fh + 1}:${fm}`).split(':').map(Number)
                  const dur = ((th - fh) * 60 + (tm - fm)) || 60
                  const height = Math.max(26, dur / 60 * ROW_H)
                  return (
                    <div
                      key={l.id}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onEdit(l) }}
                      className="absolute left-1 right-1 bg-accent hover:opacity-85 rounded-lg px-1.5 py-1 overflow-hidden cursor-pointer transition-opacity"
                      style={{ top, height }}
                    >
                      <p className="text-[10px] font-bold text-white truncate leading-tight">{l.name}</p>
                      {l.phone && height > 38 && (
                        <p className="text-[9px] text-white/60 flex items-center gap-1 mt-0.5">
                          <Phone size={8} />{l.phone}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
