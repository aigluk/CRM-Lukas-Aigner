import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

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
      .from('accounting_subscriptions')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ subscriptions: data })
  } catch (err: any) {
    console.error('[GET /api/accounting/subscriptions]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Serverfehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const body = await req.json()
    const amount = parseFloat(body.amount) || 0
    const startDate = body.start_date || new Date().toISOString().slice(0, 10)
    const row = {
      user_id: ownerId,
      name: (body.name ?? '').trim(),
      amount,
      interval: body.interval || 'monthly',
      start_date: startDate,
      active: body.active !== false,
      notes: body.notes || null,
      price_history: [{ id: crypto.randomUUID(), effective_from: startDate, amount }],
    }
    if (!row.name) return NextResponse.json({ error: 'Name fehlt.' }, { status: 400 })

    const { data, error } = await db().from('accounting_subscriptions').insert(row).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ subscription: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/accounting/subscriptions]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const body = await req.json()
    const { id, price_change, ...fields } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // price_change = { effective_from, amount, note? } → add to history, update amount field
    if (price_change) {
      const { data: existing } = await db()
        .from('accounting_subscriptions')
        .select('price_history, amount')
        .eq('id', id).eq('user_id', ownerId).single()

      const currentHistory: any[] = existing?.price_history ?? []
      // If history is empty (old sub), bootstrap it with original amount
      if (currentHistory.length === 0 && existing?.amount) {
        const sub = await db().from('accounting_subscriptions').select('start_date').eq('id', id).eq('user_id', ownerId).single()
        currentHistory.push({ id: crypto.randomUUID(), effective_from: sub.data?.start_date ?? price_change.effective_from, amount: existing.amount })
      }
      const newEntry = { id: crypto.randomUUID(), effective_from: price_change.effective_from, amount: price_change.amount, ...(price_change.note ? { note: price_change.note } : {}) }
      const updatedHistory = [...currentHistory.filter((e: any) => e.effective_from !== price_change.effective_from), newEntry]
        .sort((a: any, b: any) => a.effective_from.localeCompare(b.effective_from))
      fields.price_history = updatedHistory
      fields.amount = price_change.amount
    }

    // Allow editing an individual price history entry (typo correction)
    if (body.edit_price_entry) {
      const { data: existing } = await db().from('accounting_subscriptions').select('price_history, amount').eq('id', id).eq('user_id', ownerId).single()
      const history: any[] = existing?.price_history ?? []
      const updatedHistory = history.map((e: any) => e.id === body.edit_price_entry.id ? { ...e, ...body.edit_price_entry } : e)
        .sort((a: any, b: any) => a.effective_from.localeCompare(b.effective_from))
      // Update amount to reflect latest price
      const latestAmount = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1].amount : existing?.amount
      fields.price_history = updatedHistory
      fields.amount = latestAmount
    }

    // Allow deleting a price history entry
    if (body.delete_price_entry_id) {
      const { data: existing } = await db().from('accounting_subscriptions').select('price_history, amount').eq('id', id).eq('user_id', ownerId).single()
      const history: any[] = existing?.price_history ?? []
      const updatedHistory = history.filter((e: any) => e.id !== body.delete_price_entry_id)
        .sort((a: any, b: any) => a.effective_from.localeCompare(b.effective_from))
      const latestAmount = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1].amount : existing?.amount
      fields.price_history = updatedHistory
      fields.amount = latestAmount ?? existing?.amount
    }

    const { data, error } = await db().from('accounting_subscriptions').update(fields).eq('id', id).eq('user_id', ownerId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ subscription: data })
  } catch (err: any) {
    console.error('[PATCH /api/accounting/subscriptions]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await db().from('accounting_subscriptions').delete().eq('id', id).eq('user_id', ownerId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/accounting/subscriptions]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}
