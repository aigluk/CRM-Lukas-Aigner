import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: fetch terms + user progress for a learning path
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path') ?? 'finance_fundamentals'
  const admin = createAdminClient()

  const [{ data: terms }, { data: progress }] = await Promise.all([
    admin
      .from('learning_terms')
      .select('id, date, learning_path, term, definition, example')
      .eq('learning_path', path)
      .order('date', { ascending: false })
      .limit(60),
    admin
      .from('term_progress')
      .select('term_id, status, last_reviewed, review_count')
      .eq('user_id', user.id),
  ])

  const progressMap: Record<string, { status: string; last_reviewed: string | null; review_count: number }> = {}
  for (const p of progress ?? []) {
    progressMap[p.term_id] = { status: p.status, last_reviewed: p.last_reviewed, review_count: p.review_count }
  }

  const enriched = (terms ?? []).map(t => ({
    ...t,
    progress: progressMap[t.id] ?? { status: 'new', last_reviewed: null, review_count: 0 },
  }))

  const totalByPath: Record<string, number> = {}
  const masteredByPath: Record<string, number> = {}
  for (const t of enriched) {
    totalByPath[t.learning_path] = (totalByPath[t.learning_path] ?? 0) + 1
    if (t.progress.status === 'mastered') {
      masteredByPath[t.learning_path] = (masteredByPath[t.learning_path] ?? 0) + 1
    }
  }

  return NextResponse.json({ terms: enriched, totalByPath, masteredByPath })
}

// PATCH: update progress for a term
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { term_id, status } = await req.json()
  if (!term_id || !status) return NextResponse.json({ error: 'term_id and status required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('term_progress')
    .select('id, review_count')
    .eq('user_id', user.id)
    .eq('term_id', term_id)
    .maybeSingle()

  if (existing) {
    await admin.from('term_progress').update({
      status,
      last_reviewed: new Date().toISOString().split('T')[0],
      review_count: (existing.review_count ?? 0) + 1,
    }).eq('id', existing.id)
  } else {
    await admin.from('term_progress').insert({
      user_id: user.id,
      term_id,
      status,
      last_reviewed: new Date().toISOString().split('T')[0],
      review_count: 1,
    })
  }

  return NextResponse.json({ ok: true })
}
