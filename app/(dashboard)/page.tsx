import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceOwnerId } from '@/lib/workspace'
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const ownerId = await getWorkspaceOwnerId(user.id)
      const { data: leads } = await createAdminClient()
        .from('leads')
        .select('*')
        .eq('user_id', ownerId)
        .order('updated_at', { ascending: false })
      all = leads ?? []
    }
  }

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="shrink-0">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Dashboard</h1>
        <ClientDate />
      </div>

      <div className="shrink-0">
        <DbSetupBanner />
        <ReminderBanner />
      </div>

      <div className="shrink-0">
        <StatTiles leads={all} />
      </div>

      <div className="shrink-0">
        <KPICards leads={all} />
      </div>

      {/* Bottom row — fills remaining height on desktop so it never gets clipped or pushed off */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-5 flex-1 min-h-100 lg:min-h-0 overflow-hidden">
        <TodayPanel leads={all} />
        <ReminderWidget />
        <ActivityFeed leads={all} compact />
      </div>
    </div>
  )
}
