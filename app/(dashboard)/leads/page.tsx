import { createClient } from '@/lib/supabase/server'
import { LeadsView } from '@/components/leads/LeadsView'
import type { Lead } from '@/lib/types'

export default async function LeadsPage() {
  let leads: Lead[] = []
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })
    leads = data ?? []
  }

  return <LeadsView initialLeads={leads} />
}
