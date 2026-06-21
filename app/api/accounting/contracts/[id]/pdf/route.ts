import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ContractPdf } from '@/lib/pdf/ContractPdf'
import type { AccountingContract } from '@/lib/types'

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  const ownerId = await getWorkspaceOwnerId(user.id)

  const forceDownload = req.nextUrl.searchParams.get('dl') === '1'
  const disposition = forceDownload ? 'attachment' : 'inline'

  const admin = createAdminClient()
  const { data: contract, error } = await admin
    .from('accounting_contracts')
    .select('*')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single()

  if (error || !contract) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  if (contract.pdf_path) {
    const { data: file } = await admin.storage.from('accounting').download(contract.pdf_path)
    if (file) {
      const buffer = new Uint8Array(await file.arrayBuffer())
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${disposition}; filename="${contract.contract_number}.pdf"`,
        },
      })
    }
  }

  const { data: userData } = await admin.auth.admin.getUserById(ownerId)
  const company = userData.user?.user_metadata?.company ?? {}
  const pdfBuffer = await renderToBuffer(ContractPdf({ contract: contract as AccountingContract, company }) as any)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${contract.contract_number}.pdf"`,
    },
  })
}
