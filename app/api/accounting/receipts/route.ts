import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    const { data, error } = await db()
      .from('accounting_receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ receipts: data })
  } catch (err: any) {
    console.error('[GET /api/accounting/receipts]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Serverfehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const receiptType = (form.get('receipt_type') as string) || 'expense'
    const vendor       = (form.get('vendor') as string) || null
    const amount       = parseFloat((form.get('amount') as string) || '0')
    const date          = (form.get('date') as string) || new Date().toISOString().slice(0, 10)
    const category      = (form.get('category') as string) || null
    const notes          = (form.get('notes') as string) || null
    const ocrRaw          = (form.get('ocr_raw') as string) || null

    let filePath: string | null = null
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() || 'jpg'
      const id = crypto.randomUUID()
      filePath = `${user.id}/receipts/${id}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error: uploadError } = await db().storage.from('accounting').upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
      })
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const row = {
      user_id:      user.id,
      receipt_type: receiptType,
      vendor,
      amount,
      date,
      category,
      notes,
      file_path: filePath,
      ocr_raw: ocrRaw,
    }

    const { data, error } = await db().from('accounting_receipts').insert(row).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ receipt: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/accounting/receipts]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data: receipt } = await db().from('accounting_receipts').select('file_path').eq('id', id).eq('user_id', user.id).single()
    if (receipt?.file_path) await db().storage.from('accounting').remove([receipt.file_path])

    const { error } = await db().from('accounting_receipts').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/accounting/receipts]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}
