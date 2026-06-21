import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ContractPdf } from '@/lib/pdf/ContractPdf'
import type { CompanyInfo } from '@/lib/pdf/DocumentPdf'
import type { AccountingContract, ContractType } from '@/lib/types'

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

const PREFIX: Record<ContractType, string> = { service: 'DV', fulfillment: 'FF', agent: 'HA' }

async function nextContractNumber(userId: string, type: ContractType): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${PREFIX[type]}-${year}-`

  const { data } = await db()
    .from('accounting_contracts')
    .select('contract_number')
    .eq('user_id', userId)
    .eq('contract_type', type)
    .like('contract_number', `${prefix}%`)

  let maxSeq = 0
  for (const row of data ?? []) {
    const seq = parseInt(row.contract_number.slice(prefix.length), 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

async function generateAndStorePdf(contract: AccountingContract, userId: string): Promise<string | null> {
  try {
    const company = await getCompanyInfo(userId)
    const buffer = await renderToBuffer(ContractPdf({ contract, company }) as any)
    const path = `${userId}/contracts/${contract.id}.pdf`
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
    const ownerId = await getWorkspaceOwnerId(user.id)

    const contractType = req.nextUrl.searchParams.get('contract_type')

    let query = db().from('accounting_contracts').select('*').eq('user_id', ownerId)
    if (contractType) query = query.eq('contract_type', contractType)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ contracts: data })
  } catch (err: any) {
    console.error('[GET /api/accounting/contracts]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Serverfehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)

    const body = await req.json()
    const contractType: ContractType = ['service', 'fulfillment', 'agent'].includes(body.contract_type) ? body.contract_type : 'service'
    if (!body.party_name?.trim()) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })

    const contractNumber = body.contract_number?.trim() || await nextContractNumber(ownerId, contractType)

    const row = {
      user_id:          ownerId,
      contract_type:    contractType,
      contract_number:  contractNumber,
      status:           body.status || 'draft',
      language:         body.language === 'en' ? 'en' : 'de',
      customer_id:      body.customer_id || null,
      partner_id:       body.partner_id || null,
      sales_partner_id: body.sales_partner_id || null,
      party_name:       body.party_name.trim(),
      party_address:    body.party_address || null,
      party_email:      body.party_email || null,
      party_phone:      body.party_phone || null,
      party_birthdate:  body.party_birthdate || null,
      party_vat_number: body.party_vat_number || null,
      party_gisa_number: body.party_gisa_number || null,
      package_name:     body.package_name || null,
      package_price:    body.package_price || null,
      payment_mode:     body.payment_mode || null,
      term_months:      typeof body.term_months === 'number' ? body.term_months : null,
      start_date:       body.start_date || new Date().toISOString().slice(0, 10),
      notes:            body.notes ?? null,
    }

    const { data, error } = await db().from('accounting_contracts').insert(row).select().single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'SETUP_REQUIRED' }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const pdfPath = await generateAndStorePdf(data as AccountingContract, ownerId)
    if (pdfPath) {
      await db().from('accounting_contracts').update({ pdf_path: pdfPath }).eq('id', data.id)
      data.pdf_path = pdfPath
    }

    return NextResponse.json({ contract: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/accounting/contracts]', err?.message)
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
      .from('accounting_contracts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ownerId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const contentChanged = [
      'party_name', 'party_address', 'party_email', 'party_phone', 'party_birthdate',
      'party_vat_number', 'party_gisa_number',
      'package_name', 'package_price', 'payment_mode', 'term_months', 'start_date', 'notes', 'language',
    ].some(k => k in updates)
    if (contentChanged) {
      const pdfPath = await generateAndStorePdf(data as AccountingContract, ownerId)
      if (pdfPath) data.pdf_path = pdfPath
    }

    return NextResponse.json({ contract: data })
  } catch (err: any) {
    console.error('[PATCH /api/accounting/contracts]', err?.message)
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

    const { data: contract } = await db().from('accounting_contracts').select('pdf_path').eq('id', id).eq('user_id', ownerId).single()
    if (contract?.pdf_path) await db().storage.from('accounting').remove([contract.pdf_path])

    const { error } = await db().from('accounting_contracts').delete().eq('id', id).eq('user_id', ownerId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/accounting/contracts]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Interner Serverfehler' }, { status: 500 })
  }
}
