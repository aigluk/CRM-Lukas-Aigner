import { createClient } from '@/lib/supabase/server'
import { normalizeStatus } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

const DEV = process.env.DEV_BYPASS_AUTH === 'true'
const DEV_USER_ID = 'dev-local'

async function getAuthClient() {
  if (DEV) return { supabase: null, user: { id: DEV_USER_ID } as any }
  try {
    const supabase = await createClient()
    // Try fast local JWT validation first
    const claimsResult = await supabase.auth.getClaims().catch(() => ({ data: null, error: null }))
    const sub = (claimsResult.data as any)?.claims?.sub
    if (sub) return { supabase, user: { id: sub as string } }
    // Fallback: server-side verification
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { supabase: null, user: null }
    return { supabase, user }
  } catch {
    return { supabase: null, user: null }
  }
}

// GET — fetch all leads
export async function GET() {
  const { supabase, user } = await getAuthClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (DEV || !supabase) return NextResponse.json({ leads: [] })

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data })
}

// POST — insert or merge leads (from generator or manual)
export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (DEV || !supabase) {
    const now = new Date().toISOString()
    if (Array.isArray(body.leads)) {
      return NextResponse.json({ inserted: body.leads.length, updated: 0 })
    }
    return NextResponse.json({
      lead: { ...body, id: crypto.randomUUID(), user_id: DEV_USER_ID, status: body.status ?? 'NEU', status_date: now, created_at: now, updated_at: now },
    }, { status: 201 })
  }

  // Batch import (from generator)
  if (Array.isArray(body.leads)) {
    const rows = body.leads.map((l: any) => ({
      ...l,
      user_id:     user.id,
      status:      normalizeStatus(l.status),
      status_date: new Date().toISOString(),
    }))

    const { data: existing } = await supabase
      .from('leads')
      .select('id, name, website, status, notes, note, appointment_date, appointment_from, appointment_to')
      .eq('user_id', user.id)

    const existingMap = new Map<string, any>()
    ;(existing ?? []).forEach(l => {
      const key = buildKey(l)
      existingMap.set(key, l)
    })

    const toInsert: any[] = []
    const toUpdate: any[] = []

    rows.forEach((row: any) => {
      const key = buildKey(row)
      const ex  = existingMap.get(key)
      if (ex) {
        const incomingIsNew = !row.status || row.status === 'NEU'
        const existingIsUserSet = ex.status && ex.status !== 'NEU'
        if (incomingIsNew && existingIsUserSet) {
          row.status      = ex.status
          row.status_date = ex.status_date
        }
        if (ex.notes) row.notes = ex.notes
        if (ex.note)  row.note  = ex.note
        if (ex.appointment_date) row.appointment_date = ex.appointment_date
        toUpdate.push({ ...row, id: ex.id })
      } else {
        toInsert.push(row)
      }
    })

    if (toInsert.length) {
      const { error } = await supabase.from('leads').insert(toInsert)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (toUpdate.length) {
      for (const u of toUpdate) {
        const { id, ...rest } = u
        await supabase.from('leads').update(rest).eq('id', id).eq('user_id', user.id)
      }
    }

    return NextResponse.json({ inserted: toInsert.length, updated: toUpdate.length })
  }

  // Single insert
  const { status_date, ...rest } = body
  const lead = {
    ...rest,
    user_id:     user.id,
    status:      normalizeStatus(body.status),
    status_date: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('leads').insert(lead).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data }, { status: 201 })
}

// PATCH — update single lead
export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getAuthClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()

  if (DEV || !supabase) {
    const now = new Date().toISOString()
    if (updates.status) updates.status_date = now
    return NextResponse.json({ lead: { id, ...updates, updated_at: now } })
  }
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  if (updates.status) {
    updates.status      = normalizeStatus(updates.status)
    updates.status_date = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}

// DELETE — remove single lead
export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getAuthClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (DEV || !supabase) return NextResponse.json({ success: true })
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

function buildKey(l: { name?: string; website?: string; region?: string }): string {
  const name    = (l.name ?? '').toLowerCase().trim()
  const website = (l.website ?? '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase().trim()
  return website ? `${name}|${website}` : `${name}|${(l.region ?? '').substring(0, 30)}`
}
