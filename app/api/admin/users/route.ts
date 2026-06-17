import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

// Admin = the user with the oldest created_at (first account ever created)
async function isAdminUser(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (!data?.users?.length) return false
  const sorted = [...data.users].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  return sorted[0]?.id === userId
}

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Admin = first created user
  const sorted = [...data.users].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const isAdmin = sorted[0]?.id === userId

  // Non-admins get empty list + isAdmin: false (hides the section in UI)
  if (!isAdmin) {
    return NextResponse.json({ users: [], isAdmin: false })
  }

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email ?? '',
    username: (u.user_metadata as Record<string, unknown>)?.display_name as string ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }))
  return NextResponse.json({ users, isAdmin: true })
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  if (!(await isAdminUser(userId))) return NextResponse.json({ error: 'Nur für Admins' }, { status: 403 })

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
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  if (!(await isAdminUser(userId))) return NextResponse.json({ error: 'Nur für Admins' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
