import { createClient } from '@/lib/supabase/server'
import { getWorkspaceOwnerId } from '@/lib/workspace'
import { NextResponse } from 'next/server'
import { generateCalendarToken } from '@/lib/calendarToken'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    const ownerId = await getWorkspaceOwnerId(user.id)
    const token = generateCalendarToken(ownerId)
    return NextResponse.json({ token })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Fehler' }, { status: 500 })
  }
}
