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
      .from('accounting_salary_entries')
      .select('*')
      .eq('user_id', ownerId)
      .order('period_year', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ salaries: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Serverfehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const form = await req.formData()
    const file = form.get('file') as File | null

    let filePath: string | null = null
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() || 'pdf'
      const id = crypto.randomUUID()
      filePath = `${ownerId}/salaries/${id}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error: uploadError } = await db().storage.from('accounting').upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
      })
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const periodYear = parseInt((form.get('period_year') as string) || String(new Date().getFullYear()), 10)

    // Auto-generate GH-YYYY-NNN reference number
    const { data: existing } = await db()
      .from('accounting_salary_entries')
      .select('reference_number')
      .eq('user_id', ownerId)
      .like('reference_number', `GH-${periodYear}-%`)
    const maxSeq = (existing ?? []).reduce((m, e) => {
      const n = parseInt((e.reference_number ?? '').split('-').pop() || '0', 10)
      return Math.max(m, n)
    }, 0)
    const referenceNumber = `GH-${periodYear}-${String(maxSeq + 1).padStart(3, '0')}`

    const issueDateRaw = (form.get('issue_date') as string) || null

    const row = {
      user_id:          ownerId,
      reference_number: referenceNumber,
      employer_name:    (form.get('employer_name') as string) || '',
      gross_amount:     parseFloat((form.get('gross_amount') as string) || '0'),
      tax_withheld:     parseFloat((form.get('tax_withheld') as string) || '0'),
      period_year:      periodYear,
      issue_date:       issueDateRaw || null,
      entry_type:       (form.get('entry_type') as string) || 'employment',
      notes:            (form.get('notes') as string) || null,
      file_path:        filePath,
    }

    const { data, error } = await db().from('accounting_salary_entries').insert(row).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ salary: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const form = await req.formData()
    const id = form.get('id') as string | null
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const issueDatePatch = (form.get('issue_date') as string) || null
    const updates: Record<string, any> = {
      employer_name: (form.get('employer_name') as string) || '',
      gross_amount:  parseFloat((form.get('gross_amount') as string) || '0'),
      tax_withheld:  parseFloat((form.get('tax_withheld') as string) || '0'),
      period_year:   parseInt((form.get('period_year') as string) || String(new Date().getFullYear()), 10),
      issue_date:    issueDatePatch || null,
      entry_type:    (form.get('entry_type') as string) || 'employment',
      notes:         (form.get('notes') as string) || null,
    }

    const file = form.get('file') as File | null
    if (file && file.size > 0) {
      const { data: existing } = await db().from('accounting_salary_entries').select('file_path').eq('id', id).eq('user_id', ownerId).single()
      if (existing?.file_path) await db().storage.from('accounting').remove([existing.file_path])
      const ext = file.name.split('.').pop() || 'pdf'
      const filePath = `${ownerId}/salaries/${crypto.randomUUID()}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error: uploadError } = await db().storage.from('accounting').upload(filePath, buffer, { contentType: file.type || 'application/octet-stream' })
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
      updates.file_path = filePath
    }

    const { data, error } = await db().from('accounting_salary_entries').update(updates).eq('id', id).eq('user_id', ownerId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ salary: data })
  } catch (err: any) {
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

    const { data: entry } = await db().from('accounting_salary_entries').select('file_path').eq('id', id).eq('user_id', ownerId).single()
    if (entry?.file_path) await db().storage.from('accounting').remove([entry.file_path])

    const { error } = await db().from('accounting_salary_entries').delete().eq('id', id).eq('user_id', ownerId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}
