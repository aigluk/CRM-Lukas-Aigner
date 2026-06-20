import { createAdminClient } from '@/lib/supabase/admin'

/**
 * This CRM is single-tenant: every team member (besides the admin) should see
 * and edit the exact same leads/customers/documents, not their own private set.
 * All data is therefore always stored under the workspace owner's id — the
 * admin, defined as the oldest created account.
 */
export async function getWorkspaceOwnerId(userId: string): Promise<string> {
  if (userId === 'dev-local') return userId
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (!data?.users?.length) return userId
  const sorted = [...data.users].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  return sorted[0]?.id ?? userId
}
