import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch { return null }
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { hiddenNav } = await req.json()
  if (!Array.isArray(hiddenNav)) return NextResponse.json({ error: 'hiddenNav muss ein Array sein' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing, error: fetchErr } = await admin.auth.admin.getUserById(userId)
  if (fetchErr || !existing.user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing.user.user_metadata, hidden_nav: hiddenNav },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
