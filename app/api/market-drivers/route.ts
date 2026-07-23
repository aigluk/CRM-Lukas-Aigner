import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('market_drivers_snapshot')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ snapshot: data ?? null })
}
