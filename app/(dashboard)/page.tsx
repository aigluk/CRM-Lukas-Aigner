import { createClient } from '@/lib/supabase/server'
import { StatTiles } from '@/components/dashboard/StatTiles'
import { KPICards } from '@/components/dashboard/KPICards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { TodayPanel } from '@/components/dashboard/TodayPanel'
import { TodoWidget } from '@/components/dashboard/TodoWidget'
import { ReminderBanner } from '@/components/dashboard/ReminderBanner'
import { DbSetupBanner } from '@/components/dashboard/DbSetupBanner'
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

  const today = new Date().toLocaleDateString('de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Dashboard</h1>
        <p className="text-sm text-white/30 mt-2 capitalize font-medium">{today}</p>
      </div>

      <DbSetupBanner />
      <ReminderBanner />

      <StatTiles leads={all} />

      <KPICards leads={all} />

      {/* Bottom row — fixed height on desktop so panels don't push the page */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-5 lg:h-100 overflow-hidden">
        <TodayPanel leads={all} />
        <TodoWidget />
        <ActivityFeed leads={all} compact />
      </div>
    </div>
  )
}
