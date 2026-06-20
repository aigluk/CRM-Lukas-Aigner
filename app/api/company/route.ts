import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const DEV = process.env.DEV_BYPASS_AUTH === 'true'
const DEV_USER_ID = 'dev-local'

export async function GET() {
  let userId: string | null = null
  if (DEV) {
    userId = DEV_USER_ID
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }
  if (!userId) return NextResponse.json({ company: {} })

  const ownerId = await getWorkspaceOwnerId(userId)
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(ownerId)
  return NextResponse.json({ company: data.user?.user_metadata?.company ?? {} })
}
