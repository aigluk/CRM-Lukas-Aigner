import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { DocumentPdf } from '@/lib/pdf/DocumentPdf'
import type { AccountingDocument } from '@/lib/types'

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
  const { data: doc, error } = await admin
    .from('accounting_documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single()

  if (error || !doc) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  // Try the stored PDF first
  if (doc.pdf_path) {
    const { data: file } = await admin.storage.from('accounting').download(doc.pdf_path)
    if (file) {
      const buffer = new Uint8Array(await file.arrayBuffer())
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${disposition}; filename="${doc.doc_number}.pdf"`,
        },
      })
    }
  }

  // Fallback: regenerate on the fly
  const { data: userData } = await admin.auth.admin.getUserById(ownerId)
  const company = userData.user?.user_metadata?.company ?? {}
  const pdfBuffer = await renderToBuffer(DocumentPdf({ doc: doc as AccountingDocument, company }) as any)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${doc.doc_number}.pdf"`,
    },
  })
}
