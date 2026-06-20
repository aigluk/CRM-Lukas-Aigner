import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { LeadsView } from '@/components/leads/LeadsView'
import type { Lead } from '@/lib/types'

export default async function LeadsPage() {
  let leads: Lead[] = []
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const ownerId = await getWorkspaceOwnerId(user.id)
      const { data } = await createAdminClient()
        .from('leads')
        .select('*')
        .eq('user_id', ownerId)
        .order('updated_at', { ascending: false })
      leads = data ?? []
    }
  }

  return <LeadsView initialLeads={leads} />
}
