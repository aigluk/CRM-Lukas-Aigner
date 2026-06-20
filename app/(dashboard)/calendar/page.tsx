import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { CalendarView } from '@/components/calendar/CalendarView'
import type { Lead } from '@/lib/types'

export default async function CalendarPage() {
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
        .not('appointment_date', 'is', null)
        .order('appointment_date', { ascending: true })
      leads = data ?? []
    }
  }

  return <CalendarView leads={leads} />
}
