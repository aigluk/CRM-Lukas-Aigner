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
import { MarketRadarWidget } from '@/components/dashboard/MarketRadarWidget'
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
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Dashboard</h1>
        <ClientDate />
      </div>

      <div className="shrink-0">
        <DbSetupBanner />
        <ReminderBanner />
      </div>

      {/* Stats */}
      <div className="shrink-0">
        <StatTiles leads={all} />
      </div>

      <div className="shrink-0">
        <KPICards leads={all} />
      </div>

      {/* Bottom panels — 2-col on tablet, 4-col on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="min-h-72 lg:min-h-0 lg:h-80"><TodayPanel leads={all} /></div>
        <div className="min-h-72 lg:min-h-0 lg:h-80"><ReminderWidget /></div>
        <div className="min-h-72 lg:min-h-0 lg:h-80"><ActivityFeed leads={all} compact /></div>
        <div className="min-h-72 lg:min-h-0 lg:h-80"><MarketRadarWidget /></div>
      </div>
    </div>
  )
}
