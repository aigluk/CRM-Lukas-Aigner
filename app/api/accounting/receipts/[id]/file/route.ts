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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  const ownerId = await getWorkspaceOwnerId(user.id)

  const admin = createAdminClient()
  const { data: receipt, error } = await admin
    .from('accounting_receipts')
    .select('file_path')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single()

  if (error || !receipt?.file_path) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data: file, error: dlError } = await admin.storage.from('accounting').download(receipt.file_path)
  if (dlError || !file) return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })

  const buffer = new Uint8Array(await file.arrayBuffer())
  return new NextResponse(buffer, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
}
