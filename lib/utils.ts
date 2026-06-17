import { LeadStatus } from './types'

export function normalizeStatus(status?: string | null): LeadStatus {
  const s = (status ?? '').toLowerCase().trim()
  if (s.includes('closing') || s.includes('abschluss call'))                  return 'CLOSING CALL'
  if (s.includes('follow') || s.includes('zweiter') || s.includes('nachfass')) return 'FOLLOW UP'
  if (s.includes('verkauf') || s.includes('gespräch') || s.includes('termin') || s.includes('erst') || s.includes('kontakt')) return 'VERKAUFSGESPRÄCH'
  if (s.includes('abschluss') || s.includes('deal won'))                       return 'ABSCHLUSS'
  if (s.includes('kein') || s.includes('interesse'))                           return 'KEIN INTERESSE'
  if (s.includes('bestand'))                                                   return 'BESTANDSKUNDE'
  if (s.includes('no go') || s.includes('nogo') || s.includes('blacklist'))   return 'NO GO'
  return 'NEU'
}

export function formatRelativeDateTime(date?: string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
  if (isToday)     return `Heute, ${time}`
  if (isYesterday) return `Gestern, ${time}`
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + `, ${time}`
}

export function formatDate(date?: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateLong(date?: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getLeadKey(lead: { name?: string; website?: string; region?: string }): string {
  const name = (lead.name ?? '').toLowerCase().trim()
  const website = (lead.website ?? '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase().trim()
  return website ? `${name}|${website}` : `${name}|${(lead.region ?? '').substring(0, 30)}`
}

export function stripEmoji(s?: string | null): string {
  if (!s) return ''
  return s.replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, '').replace(/\s+/g, ' ').trim()
}

export function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}
