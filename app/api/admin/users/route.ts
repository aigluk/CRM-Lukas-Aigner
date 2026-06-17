import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAuth() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  return !error && !!data
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    username: (u.user_metadata as any)?.display_name ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }))
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }
  const { email, password, username } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'E-Mail und Passwort erforderlich' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: username ? { display_name: username } : undefined,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
