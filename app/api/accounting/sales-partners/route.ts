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
      .from('accounting_sales_partners')
      .select('*')
      .eq('user_id', ownerId)
      .order('name', { ascending: true })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ salesPartners: data })
  } catch (err: any) {
    console.error('[GET /api/accounting/sales-partners]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Serverfehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const body = await req.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })

    const row = {
      user_id:        ownerId,
      name:           body.name.trim(),
      contact_person: body.contact_person || null,
      address:        body.address || null,
      country:        body.country || null,
      vat_number:     body.vat_number || null,
      vat_liable:     body.vat_liable ?? true,
      email:          body.email || null,
      phone:          body.phone || null,
      website:        body.website || null,
      notes:          body.notes || null,
    }

    const { data, error } = await db().from('accounting_sales_partners').insert(row).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ salesPartner: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/accounting/sales-partners]', err?.message)
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

    const { data, error } = await db()
      .from('accounting_sales_partners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ownerId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ salesPartner: data })
  } catch (err: any) {
    console.error('[PATCH /api/accounting/sales-partners]', err?.message)
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

    const { error } = await db().from('accounting_sales_partners').delete().eq('id', id).eq('user_id', ownerId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/accounting/sales-partners]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}
