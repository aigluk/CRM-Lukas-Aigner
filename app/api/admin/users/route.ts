import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://la-crm-one.vercel.app'

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

  const sorted = [...data.users].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const isAdmin = sorted[0]?.id === userId
  const me = data.users.find(u => u.id === userId)
  const myPermissions = ((me?.user_metadata as Record<string, unknown>)?.permissions as string[] | undefined) ?? null
  const myHiddenNav   = ((me?.user_metadata as Record<string, unknown>)?.hidden_nav  as string[] | undefined) ?? []

  if (!isAdmin) {
    return NextResponse.json({ users: [], isAdmin: false, myPermissions, myHiddenNav })
  }

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email ?? '',
    username: (u.user_metadata as Record<string, unknown>)?.display_name as string ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    permissions: ((u.user_metadata as Record<string, unknown>)?.permissions as string[] | undefined) ?? null,
  }))
  return NextResponse.json({ users, isAdmin: true, myPermissions: null, myHiddenNav })
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  if (!(await isAdminUser(userId))) return NextResponse.json({ error: 'Nur für Admins' }, { status: 403 })

  const body = await req.json()
  const admin = createAdminClient()

  // Send password reset link to existing user
  if (body.action === 'send_reset') {
    const { email } = body
    if (!email) return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 })
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // Invite new user (sends branded invite email, no password sharing needed)
  const { email, username, permissions } = body
  if (!email) return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 })

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      ...(username ? { display_name: username } : {}),
      ...(Array.isArray(permissions) ? { permissions } : {}),
    },
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  if (!(await isAdminUser(userId))) return NextResponse.json({ error: 'Nur für Admins' }, { status: 403 })

  const { id, username, permissions } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing, error: fetchError } = await admin.auth.admin.getUserById(id)
  if (fetchError || !existing.user) return NextResponse.json({ error: fetchError?.message || 'Benutzer nicht gefunden' }, { status: 404 })

  const { error } = await admin.auth.admin.updateUserById(id, {
    user_metadata: {
      ...existing.user.user_metadata,
      display_name: username,
      permissions,
    },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
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
