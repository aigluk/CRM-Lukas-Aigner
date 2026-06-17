import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/CalendarView'
import type { Lead } from '@/lib/types'

export default async function CalendarPage() {
  let leads: Lead[] = []
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('leads')
      .select('*')
      .not('appointment_date', 'is', null)
      .order('appointment_date', { ascending: true })
    leads = data ?? []
  }

  return <CalendarView leads={leads} />
}
