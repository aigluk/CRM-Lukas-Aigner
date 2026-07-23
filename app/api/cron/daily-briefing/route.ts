import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function extractJson(raw: string): Record<string, unknown> | null {
  const text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0, end = -1
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) return null
  try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
}

const BRIEFING_PROMPT = (date: string) => `Heute ist ${date}. Recherchiere aktuelle Finanz- und Wirtschaftsnachrichten — konkrete Zahlen, Kursbewegungen, Entscheidungen von heute oder dieser Woche.

Liefere 4 Blöcke:
1. Finanzmärkte: DAX/ATX/SMI Schlusskurse, EUR/USD, Leitzinsen EZB/Fed, Gold/Öl
2. Immobiliensektor DACH: Bauzinsen, Immobilienpreise, Regulierung
3. Weltwirtschaft: Inflation, BIP, Zentralbank-Signale, Handelspolitik
4. Unternehmen & Aktien: Big Tech Earnings, DAX/ATX/SMI Schwergewichte

Pro Block: summary (4-5 Sätze mit konkreten Zahlen), callout (Relevanz für Immobilienentwickler/Investoren), source.

Extrahiere alle Fachbegriffe als Glossar. Liefere 3 Lernbegriffe (finance_fundamentals, immobilienfinanzierung, makrooekonomie) mit Definition und DACH-Beispiel.

Antworte nur mit JSON, kein Markdown:
{"sections":[{"icon":"📈","title":"Finanzmärkte","summary":"...","callout":"...","source":"..."}],"glossary":[{"term":"...","definition":"..."}],"learning_terms":[{"learning_path":"finance_fundamentals","term":"...","definition":"...","example":"..."}]}`

const SNAPSHOT_PROMPT = (date: string) => `Heute ist ${date}. Aktuelle Marktdaten, nur JSON kein Markdown:
{"zins_countdown":{"fed_date":"YYYY-MM-DD","ezb_date":"YYYY-MM-DD","fed_consensus":"z.B. Pause","ezb_consensus":"z.B. -25bp"},"makro_kalender":[{"event":"CPI USA","date":"YYYY-MM-DD","previous":"3.2%","expected":"3.1%"}],"earnings_watch":[{"company":"Apple","date":"YYYY-MM-DD","expected_eps":"$1.45"}],"sentiment_ampel":{"vix":18.5,"level":"ruhig","label":"Märkte ruhig"},"geo_risiko":[{"region":"...","status":"..."}]}`

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = today()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('daily_briefing').select('id').eq('date', date).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, skipped: true })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const briefingResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{ role: 'user', content: BRIEFING_PROMPT(date) }],
  })

  const rawText = briefingResponse.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const briefingData = extractJson(rawText)
  if (!briefingData) {
    return NextResponse.json({ error: 'Parse failed', preview: rawText.slice(0, 300) }, { status: 500 })
  }

  const { error: briefingErr } = await supabase.from('daily_briefing').insert({
    date, sections: briefingData.sections ?? [], glossary: briefingData.glossary ?? [],
  })
  if (briefingErr) return NextResponse.json({ error: briefingErr.message }, { status: 500 })

  if (Array.isArray(briefingData.learning_terms) && briefingData.learning_terms.length > 0) {
    await supabase.from('learning_terms').insert(
      (briefingData.learning_terms as Array<Record<string, unknown>>).map(t => ({ ...t, date }))
    )
  }

  const snapResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{ role: 'user', content: SNAPSHOT_PROMPT(date) }],
  })

  const snapRaw = snapResponse.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
  const snapshotData = extractJson(snapRaw)

  if (snapshotData) {
    await supabase.from('market_drivers_snapshot').upsert({
      date,
      zins_countdown:  snapshotData.zins_countdown  ?? null,
      makro_kalender:  snapshotData.makro_kalender  ?? null,
      earnings_watch:  snapshotData.earnings_watch  ?? null,
      sentiment_ampel: snapshotData.sentiment_ampel ?? null,
      geo_risiko:      snapshotData.geo_risiko      ?? null,
    }, { onConflict: 'date' })
  }

  return NextResponse.json({ ok: true, date })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
