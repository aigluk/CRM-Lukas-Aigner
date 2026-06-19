import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { DocumentPdf, type CompanyInfo } from '@/lib/pdf/DocumentPdf'
import type { AccountingDocument, DocType, LineItem } from '@/lib/types'

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

async function getCompanyInfo(userId: string): Promise<CompanyInfo> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(userId)
  return (data.user?.user_metadata?.company as CompanyInfo) ?? {}
}

const PREFIX: Record<DocType, string> = { invoice: 'RE', quote: 'AN' }

async function nextDocNumber(userId: string, docType: DocType): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${PREFIX[docType]}-${year}-`

  const { data } = await db()
    .from('accounting_documents')
    .select('doc_number')
    .eq('user_id', userId)
    .eq('doc_type', docType)
    .like('doc_number', `${prefix}%`)

  let maxSeq = 0
  for (const row of data ?? []) {
    const seq = parseInt(row.doc_number.slice(prefix.length), 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

async function generateAndStorePdf(doc: AccountingDocument, userId: string): Promise<string | null> {
  try {
    const company = await getCompanyInfo(userId)
    const buffer = await renderToBuffer(DocumentPdf({ doc, company }) as any)
    const path = `${userId}/documents/${doc.id}.pdf`
    const { error } = await db().storage.from('accounting').upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (error) {
      console.error('[PDF upload]', error.message)
      return null
    }
    return path
  } catch (err: any) {
    console.error('[PDF generate]', err?.message)
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const docType = req.nextUrl.searchParams.get('doc_type')

    let query = db().from('accounting_documents').select('*').eq('user_id', user.id)
    if (docType) query = query.eq('doc_type', docType)

    const { data, error } = await query.order('issue_date', { ascending: false })
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ documents: data })
  } catch (err: any) {
    console.error('[GET /api/accounting/documents]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Serverfehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const body = await req.json()
    const docType: DocType = body.doc_type === 'quote' ? 'quote' : 'invoice'
    const lineItems: LineItem[] = Array.isArray(body.line_items) ? body.line_items : []

    const docNumber = body.doc_number?.trim() || await nextDocNumber(user.id, docType)

    const row = {
      user_id:        user.id,
      doc_type:       docType,
      doc_number:     docNumber,
      client_name:    body.client_name ?? '',
      client_address: body.client_address ?? null,
      client_email:   body.client_email ?? null,
      issue_date:     body.issue_date || new Date().toISOString().slice(0, 10),
      due_date:       body.due_date || null,
      line_items:     lineItems,
      tax_rate:       typeof body.tax_rate === 'number' ? body.tax_rate : 20,
      notes:          body.notes ?? null,
      status:         body.status || 'draft',
    }

    const { data, error } = await db().from('accounting_documents').insert(row).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const pdfPath = await generateAndStorePdf(data as AccountingDocument, user.id)
    if (pdfPath) {
      await db().from('accounting_documents').update({ pdf_path: pdfPath }).eq('id', data.id)
      data.pdf_path = pdfPath
    }

    return NextResponse.json({ document: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/accounting/documents]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data, error } = await db()
      .from('accounting_documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Regenerate PDF if content fields changed (not just a status flip)
    const contentChanged = ['line_items', 'client_name', 'client_address', 'client_email', 'tax_rate', 'notes', 'due_date', 'issue_date']
      .some(k => k in updates)
    if (contentChanged) {
      const pdfPath = await generateAndStorePdf(data as AccountingDocument, user.id)
      if (pdfPath) data.pdf_path = pdfPath
    }

    return NextResponse.json({ document: data })
  } catch (err: any) {
    console.error('[PATCH /api/accounting/documents]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data: doc } = await db().from('accounting_documents').select('pdf_path').eq('id', id).eq('user_id', user.id).single()
    if (doc?.pdf_path) await db().storage.from('accounting').remove([doc.pdf_path])

    const { error } = await db().from('accounting_documents').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/accounting/documents]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}
