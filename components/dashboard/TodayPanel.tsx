'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lead } from '@/lib/types'
import { isSameDay } from '@/lib/utils'
import { Phone, Pencil } from 'lucide-react'
import { AppointmentEditModal } from '@/components/ui/AppointmentEditModal'

interface Props {
  leads: Lead[]
  onEdit?: (lead: Lead) => void  // optional — calendar provides this; dashboard uses local modal
}

export function TodayPanel({ leads: initialLeads, onEdit }: Props) {
  const router = useRouter()
  const today  = new Date()

  // Own state so saving from dashboard updates the panel without full page reload
  const [leads, setLeads]         = useState<Lead[]>(initialLeads)
  const [editLead, setEditLead]   = useState<Lead | null>(null)

  const appts = leads
    .filter(l => l.appointment_date && isSameDay(new Date(l.appointment_date), today))
    .sort((a, b) => (a.appointment_from || '').localeCompare(b.appointment_from || ''))

  const dayNum   = today.getDate()
  const weekday  = today.toLocaleDateString('de-AT', { weekday: 'long' })
  const monthYear = today.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })

  function handleEdit(lead: Lead) {
    if (onEdit) {
      onEdit(lead)   // calendar: bubble up to parent which owns the modal
    } else {
      setEditLead(lead)  // dashboard: open local modal
    }
  }

  function handleSaved(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
  }

  function handleRemoved(id: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, appointment_date: undefined } : l))
  }

  return (
    <>
      {editLead && (
        <AppointmentEditModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
        />
      )}

      <div
        className="bg-panel rounded-2xl p-5 flex flex-col h-full"
        onClick={() => router.push('/calendar')}
        style={{ cursor: 'pointer' }}
      >
        {/* Date header */}
        <div className="flex items-center gap-4 mb-4 shrink-0">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-2xl font-black text-white leading-none">{dayNum}</span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-black text-white capitalize leading-tight">{weekday}</p>
            <p className="text-xs text-white/35 capitalize mt-0.5">{monthYear}</p>
            {appts.length > 0 && (
              <p className="text-xs font-bold text-accent mt-1">
                {appts.length} {appts.length === 1 ? 'Termin' : 'Termine'} heute
              </p>
            )}
          </div>
        </div>

        {/* Appointment list */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
          {appts.length === 0 ? (
            <p className="text-xs text-white/25 font-medium">Keine Termine heute</p>
          ) : (
            appts.map(l => (
              <div
                key={l.id}
                onClick={e => { e.stopPropagation(); handleEdit(l) }}
                className="flex items-center gap-3 bg-dark rounded-xl px-3 py-2.5 hover:bg-panel-hover transition-colors cursor-pointer group"
              >
                <div className="w-3 h-3 rounded-full bg-accent shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{l.name}</p>
                  {l.phone && (
                    <a
                      href={`tel:${l.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-accent transition-colors"
                    >
                      <Phone size={10} />{l.phone}
                    </a>
                  )}
                </div>
                <Pencil size={12} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
