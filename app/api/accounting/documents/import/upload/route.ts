import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextRequest } from 'next/server'

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

// Returns text/html so the iframe body is reliably readable via innerText
// in all browsers (Chrome renders application/json in a special viewer that
// wraps the text in extra DOM nodes, making innerText unreliable).
function htmlJson(data: object, status = 200) {
  return new Response(
    `<html><body><pre>${JSON.stringify(data)}</pre></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

// Accepts a file upload immediately after the user selects it (while the
// browser's OS-level security scope for cloud-provider files is still active).
// Returns the storage path so the finalize step only needs to create the DB row.
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return htmlJson({ error: 'Nicht angemeldet' }, 401)
    const ownerId = await getWorkspaceOwnerId(user.id)

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file || file.size === 0) return htmlJson({ error: 'Datei fehlt.' }, 400)

    const id = crypto.randomUUID()
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
    const filePath = `${ownerId}/documents/${id}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) return htmlJson({ error: 'Datei leer.' }, 400)

    const { error: uploadError } = await db().storage.from('accounting').upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })
    if (uploadError) return htmlJson({ error: uploadError.message }, 500)

    return htmlJson({ file_path: filePath, file_id: id })
  } catch (err: any) {
    console.error('[POST /api/accounting/documents/import/upload]', err?.message)
    return htmlJson({ error: err?.message ?? 'Upload fehlgeschlagen' }, 500)
  }
}
