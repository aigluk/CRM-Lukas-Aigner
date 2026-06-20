import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { normalizeStatus } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

const DEV = process.env.DEV_BYPASS_AUTH === 'true'
const DEV_USER_ID = 'dev-local'

async function getAuthUser(): Promise<{ id: string } | null> {
  if (DEV) return { id: DEV_USER_ID }
  try {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}

const db = () => createAdminClient()

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const { data, error } = await db()
      .from('leads')
      .select('*')
      .eq('user_id', ownerId)
      .order('updated_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ leads: data })
  } catch (err: any) {
    console.error('[GET /api/leads]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Serverfehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet – bitte neu einloggen.' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const body = await req.json()

    // Batch import
    if (Array.isArray(body.leads)) {
      const rows = body.leads.map((l: any) => ({
        ...l,
        user_id:     ownerId,
        status:      normalizeStatus(l.status),
        status_date: new Date().toISOString(),
      }))

      const { data: existing } = await db()
        .from('leads')
        .select('id, name, website, status, notes, note, appointment_date, appointment_from, appointment_to')
        .eq('user_id', ownerId)

      const existingMap = new Map<string, any>()
      ;(existing ?? []).forEach(l => existingMap.set(buildKey(l), l))

      const toInsert: any[] = []
      const toUpdate: any[] = []

      rows.forEach((row: any) => {
        const ex = existingMap.get(buildKey(row))
        if (ex) {
          if ((!row.status || row.status === 'NEU') && ex.status && ex.status !== 'NEU') {
            row.status = ex.status; row.status_date = ex.status_date
          }
          if (ex.notes) row.notes = ex.notes
          if (ex.note) row.note = ex.note
          if (ex.appointment_date) row.appointment_date = ex.appointment_date
          toUpdate.push({ ...row, id: ex.id })
        } else {
          toInsert.push(row)
        }
      })

      if (toInsert.length) {
        const { error } = await db().from('leads').insert(toInsert)
        if (error) {
          if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }
      for (const u of toUpdate) {
        const { id, ...rest } = u
        await db().from('leads').update(rest).eq('id', id).eq('user_id', ownerId)
      }
      return NextResponse.json({ inserted: toInsert.length, updated: toUpdate.length })
    }

    // Single insert
    const { status_date, ...rest } = body
    const lead = {
      ...rest,
      user_id:     ownerId,
      status:      normalizeStatus(body.status),
      status_date: new Date().toISOString(),
    }

    const { data, error } = await db().from('leads').insert(lead).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ lead: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/leads]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    if (updates.status) {
      updates.status = normalizeStatus(updates.status)
      updates.status_date = new Date().toISOString()
    }

    const { data, error } = await db()
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ownerId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lead: data })
  } catch (err: any) {
    console.error('[PATCH /api/leads]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const ids = url.searchParams.get('ids') // comma-separated batch delete

    if (!id && !ids) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const targetIds = ids ? ids.split(',').map(s => s.trim()).filter(Boolean) : [id!]

    const { error } = await db()
      .from('leads')
      .delete()
      .in('id', targetIds)
      .eq('user_id', ownerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: targetIds.length })
  } catch (err: any) {
    console.error('[DELETE /api/leads]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

function buildKey(l: { name?: string; website?: string; region?: string }): string {
  const name = (l.name ?? '').toLowerCase().trim()
  const website = (l.website ?? '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase().trim()
  return website ? `${name}|${website}` : `${name}|${(l.region ?? '').substring(0, 30)}`
}
