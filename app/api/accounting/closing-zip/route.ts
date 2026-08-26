import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { DocumentPdf } from '@/lib/pdf/DocumentPdf'
import type { AccountingDocument, AccountingReceipt } from '@/lib/types'
import JSZip from 'jszip'

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

const MONTH_NAMES_DE = ['Jaenner', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function inMonth(dateStr: string | undefined, year: number, month: number): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === month
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._\-À-ɏ]/g, '_').slice(0, 60)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ownerId = await getWorkspaceOwnerId(user.id)

  const body = await req.json() as { periodMode: 'month' | 'quarter' | 'year'; periodYear: number; periodMonth?: number; periodQuarter?: number; label: string }
  const { periodMode, periodYear, periodMonth = 0, periodQuarter = 0, label } = body

  const admin = createAdminClient()
  const { data: userData } = await admin.auth.admin.getUserById(ownerId)
  const company = userData.user?.user_metadata?.company ?? {}

  const [{ data: docs }, { data: receiptsData }] = await Promise.all([
    admin.from('accounting_documents').select('*').eq('user_id', ownerId),
    admin.from('accounting_receipts').select('*').eq('user_id', ownerId),
  ])

  const allDocs: AccountingDocument[] = docs ?? []
  const allReceipts: AccountingReceipt[] = receiptsData ?? []

  // Determine which months to include
  let months: { year: number; month: number }[] = []
  if (periodMode === 'year') {
    months = Array.from({ length: 12 }, (_, i) => ({ year: periodYear, month: i }))
  } else if (periodMode === 'quarter') {
    const startM = periodQuarter * 3
    months = [0, 1, 2].map(i => ({ year: periodYear, month: startM + i }))
  } else {
    months = [{ year: periodYear, month: periodMonth }]
  }

  const zip = new JSZip()
  const rootName = `Abschluss-${label.replace(/\s+/g, '-')}`
  const root = zip.folder(rootName)!

  for (const { year, month } of months) {
    const monthLabel = `${String(month + 1).padStart(2, '0')}_${MONTH_NAMES_DE[month]}`
    const monthFolder = root.folder(monthLabel)!
    const ausFolder = monthFolder.folder('Ausgangsrechnungen')!
    const einFolder = monthFolder.folder('Eingangsrechnungen')!

    // Ausgangsrechnungen: paid invoices for this month
    const monthInvoices = allDocs.filter(d =>
      (d.doc_type === 'invoice' || d.doc_type === 'storno') &&
      d.status === 'paid' &&
      inMonth(d.issue_date, year, month)
    )

    for (const doc of monthInvoices) {
      try {
        let fileBuffer: Uint8Array
        let ext = 'pdf'
        if (doc.pdf_path) {
          const { data: file } = await admin.storage.from('accounting').download(doc.pdf_path)
          if (file) {
            fileBuffer = new Uint8Array(await file.arrayBuffer())
            ext = (doc.pdf_path.split('.').pop() || 'pdf').toLowerCase()
          } else {
            throw new Error('no file')
          }
        } else {
          const buf = await renderToBuffer(DocumentPdf({ doc, company }) as any)
          fileBuffer = new Uint8Array(buf)
        }
        ausFolder.file(`${safeName(doc.doc_number)}_${safeName(doc.client_name)}.${ext}`, fileBuffer)
      } catch {
        // Skip if PDF generation fails
      }
    }

    // Eingangsrechnungen: receipts for this month
    const monthReceipts = allReceipts.filter(r => inMonth(r.date, year, month))

    for (const receipt of monthReceipts) {
      try {
        if (!receipt.file_path) continue
        const { data: file } = await admin.storage.from('accounting').download(receipt.file_path)
        if (!file) continue
        const fileBuffer = new Uint8Array(await file.arrayBuffer())
        const origName = receipt.file_path.split('/').pop() || 'beleg'
        const ext = origName.split('.').pop() || 'pdf'
        const label = safeName(receipt.vendor || receipt.category || 'Beleg')
        einFolder.file(`${String(monthReceipts.indexOf(receipt) + 1).padStart(2, '0')}_${label}.${ext}`, fileBuffer)
      } catch {
        // Skip if download fails
      }
    }
  }

  const zipUint8 = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  const zipBuffer = Buffer.from(zipUint8)
  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${rootName}.zip"`,
    },
  })
}
