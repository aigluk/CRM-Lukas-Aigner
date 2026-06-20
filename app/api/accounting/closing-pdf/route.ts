import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ClosingPdf, type ClosingPdfData } from '@/lib/pdf/ClosingPdf'

export const runtime = 'nodejs'

const DEV = process.env.DEV_BYPASS_AUTH === 'true'
const DEV_USER_ID = 'dev-local'

export async function POST(req: NextRequest) {
  let userId: string | null = null
  if (DEV) {
    userId = DEV_USER_ID
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = (await req.json()) as ClosingPdfData
  const ownerId = await getWorkspaceOwnerId(userId)
  const admin = createAdminClient()
  const { data: userData } = await admin.auth.admin.getUserById(ownerId)
  const company = userData.user?.user_metadata?.company ?? {}

  const buffer = await renderToBuffer(ClosingPdf({ data, company }) as any)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Abschluss-${data.label.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
