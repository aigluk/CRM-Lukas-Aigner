import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'

function hmacSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'la-crm-calendar-secret'
}

export function generateCalendarToken(ownerId: string): string {
  const mac = crypto.createHmac('sha256', hmacSecret()).update(ownerId).digest('hex').slice(0, 24)
  return Buffer.from(`${ownerId}:${mac}`).toString('base64url')
}

function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const sep = decoded.lastIndexOf(':')
    const ownerId = decoded.slice(0, sep)
    const mac = decoded.slice(sep + 1)
    const expected = crypto.createHmac('sha256', hmacSecret()).update(ownerId).digest('hex').slice(0, 24)
    return mac === expected ? ownerId : null
  } catch {
    return null
  }
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function fold(line: string): string {
  if (line.length <= 75) return line
  const out = [line.slice(0, 75)]
  let i = 75
  while (i < line.length) { out.push(' ' + line.slice(i, i + 74)); i += 74 }
  return out.join('\r\n')
}

function fmtDate(date: string, time?: string): string {
  const d = date.replace(/-/g, '')
  if (!time) return d
  const t = time.replace(':', '') + '00'
  return `${d}T${t}`
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const nh = (h + 1) % 24
  return `${String(nh).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Vienna',
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
].join('\r\n')

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new NextResponse('Token fehlt', { status: 400 })

  const ownerId = verifyToken(token)
  if (!ownerId) return new NextResponse('Ungültiger Token', { status: 401 })

  const db = createAdminClient()
  const { data: leads, error } = await db
    .from('leads')
    .select('id,name,status,appointment_date,appointment_from,appointment_to,appointment_type,notes,updated_at')
    .eq('user_id', ownerId)
    .not('appointment_date', 'is', null)

  if (error) return new NextResponse('Datenbankfehler', { status: 500 })

  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LA CRM//Calendar//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LA CRM',
    'X-WR-CALDESC:Termine aus LA CRM',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
    VTIMEZONE,
  ]

  for (const lead of leads ?? []) {
    if (!lead.appointment_date) continue
    const from = lead.appointment_from || '09:00'
    const to   = lead.appointment_to   || addHour(from)
    const type = lead.appointment_type || lead.status || ''
    const summary = type ? `${lead.name} - ${type}` : lead.name
    const dtstamp = lead.updated_at
      ? lead.updated_at.replace(/[-:]/g, '').slice(0, 15) + 'Z'
      : now

    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${lead.id}@la-crm`),
      fold(`DTSTAMP:${dtstamp}`),
      fold(`DTSTART;TZID=Europe/Vienna:${fmtDate(lead.appointment_date, from)}`),
      fold(`DTEND;TZID=Europe/Vienna:${fmtDate(lead.appointment_date, to)}`),
      fold(`SUMMARY:${esc(summary)}`),
      ...(lead.notes ? [fold(`DESCRIPTION:${esc(lead.notes)}`)] : []),
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache, max-age=0',
    },
  })
}
