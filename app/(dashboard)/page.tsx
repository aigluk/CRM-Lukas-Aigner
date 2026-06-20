import { createClient } from '@/lib/supabase/server'
import { StatTiles } from '@/components/dashboard/StatTiles'
import { KPICards } from '@/components/dashboard/KPICards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { TodayPanel } from '@/components/dashboard/TodayPanel'
import { ReminderWidget } from '@/components/dashboard/ReminderWidget'
import { ReminderBanner } from '@/components/dashboard/ReminderBanner'
import { DbSetupBanner } from '@/components/dashboard/DbSetupBanner'
import { ClientDate } from '@/components/dashboard/ClientDate'
import type { Lead } from '@/lib/types'

export default async function DashboardPage() {
  let all: Lead[] = []
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })
    all = leads ?? []
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Dashboard</h1>
        <ClientDate />
      </div>

      <DbSetupBanner />
      <ReminderBanner />

      <StatTiles leads={all} />

      <KPICards leads={all} />

      {/* Bottom row — fixed height on desktop so panels don't push the page */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-5 lg:h-100 overflow-hidden">
        <TodayPanel leads={all} />
        <ReminderWidget />
        <ActivityFeed leads={all} compact />
      </div>
    </div>
  )
}
