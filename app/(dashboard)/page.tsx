import { createClient } from '@/lib/supabase/server'
import { KPICards } from '@/components/dashboard/KPICards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { TodayPanel } from '@/components/dashboard/TodayPanel'
import { TodoWidget } from '@/components/dashboard/TodoWidget'
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
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Dashboard</h1>
          <p className="text-sm text-white/30 mt-2 capitalize font-medium">{today}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-panel rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-accent-green shrink-0" />
          <span className="text-xs font-semibold text-white/40">
            {all.length} Leads
          </span>
        </div>
      </div>

      <div className="mb-5">
        <KPICards leads={all} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <TodayPanel leads={all} />
        </div>
        <div className="lg:col-span-1">
          <TodoWidget />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed leads={all} compact />
        </div>
      </div>
    </div>
  )
}
