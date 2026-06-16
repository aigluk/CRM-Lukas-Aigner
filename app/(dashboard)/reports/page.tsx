import { createClient } from '@/lib/supabase/server'
import { ReportsView } from '@/components/reports/ReportsView'
import type { Lead } from '@/lib/types'

export default async function ReportsPage() {
  let leads: Lead[] = []
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('leads')
      .select('id, status, branche, industry, status_date, created_at')
      .order('created_at', { ascending: false })
    leads = (data as Lead[]) ?? []
  }

  return <ReportsView leads={leads} />
}
