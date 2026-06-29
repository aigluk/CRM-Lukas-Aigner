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

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file || file.size === 0) return NextResponse.json({ error: 'Datei fehlt.' }, { status: 400 })

    const docNumber  = (form.get('doc_number') as string)?.trim() || ''
    const clientName = (form.get('client_name') as string)?.trim() || ''
    const issueDate   = (form.get('issue_date') as string) || new Date().toISOString().slice(0, 10)
    const taxRate     = parseFloat((form.get('tax_rate') as string) || '0')
    const status      = (form.get('status') as string) || 'paid'
    const grossAmount = parseFloat((form.get('amount') as string) || '0')

    if (!docNumber) return NextResponse.json({ error: 'Rechnungsnummer fehlt.' }, { status: 400 })
    if (!clientName) return NextResponse.json({ error: 'Kunde fehlt.' }, { status: 400 })
    if (!grossAmount || grossAmount <= 0) return NextResponse.json({ error: 'Betrag fehlt.' }, { status: 400 })

    const id = crypto.randomUUID()
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
    const filePath = `${ownerId}/documents/${id}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) return NextResponse.json({ error: 'Datei konnte nicht gelesen werden (0 Byte) — bitte erneut auswählen.' }, { status: 400 })
    const { error: uploadError } = await db().storage.from('accounting').upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const unitPrice = grossAmount / (1 + taxRate / 100)

    const row = {
      id,
      user_id:     ownerId,
      doc_type:    'invoice',
      doc_number:  docNumber,
      client_name: clientName,
      issue_date:  issueDate,
      tax_rate:    taxRate,
      status,
      line_items:  [{ description: 'Leistung', qty: 1, unit_price: unitPrice }],
      pdf_path:    filePath,
      is_imported: true,
    }

    const { data, error } = await db().from('accounting_documents').insert(row).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      await db().storage.from('accounting').remove([filePath])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ document: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/accounting/documents/import]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}
