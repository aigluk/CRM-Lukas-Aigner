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
  } catch { return null }
}

const db = () => createAdminClient()

// Content negotiation: form submissions (Accept: text/html) get an HTML wrapper
// so the iframe can read innerText; fetch requests get plain JSON.
function respond(req: NextRequest, data: object, status = 200) {
  const accept = req.headers.get('accept') ?? ''
  if (accept.includes('text/html')) {
    return new Response(
      `<html><body><pre>${JSON.stringify(data)}</pre></body></html>`,
      { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
  return NextResponse.json(data, { status })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return respond(req, { error: 'Nicht angemeldet' }, 401)
    const ownerId = await getWorkspaceOwnerId(user.id)

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file || file.size === 0) return respond(req, { error: 'Datei fehlt.' }, 400)

    const id = crypto.randomUUID()
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
    const filePath = `${ownerId}/documents/${id}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) return respond(req, { error: 'Datei leer.' }, 400)

    const { error: uploadError } = await db().storage.from('accounting').upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })
    if (uploadError) return respond(req, { error: uploadError.message }, 500)

    return respond(req, { file_path: filePath, file_id: id })
  } catch (err: any) {
    console.error('[POST /api/accounting/documents/import/upload]', err?.message)
    return respond(req, { error: err?.message ?? 'Upload fehlgeschlagen' }, 500)
  }
}
