import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
2. Immobiliensektor DACH: Bauzinsen, Immobilienpreise, Regulierung (aktuelle Entwicklungen)
3. Weltwirtschaft: Inflation, BIP, Zentralbank-Signale, Handelspolitik
4. Unternehmen & Aktien: Big Tech Earnings, DAX/ATX/SMI Schwergewichte

Pro Block: summary (4-5 Sätze mit konkreten Zahlen und %-Bewegungen), callout (1-2 Sätze: konkrete Relevanz für Immobilienentwickler/Investoren), source (Quelle).

Extrahiere alle Fachbegriffe aus deinen Texten als Glossar mit allgemeinverständlichen Definitionen.

Liefere 3 Lernbegriffe (je einen: finance_fundamentals, immobilienfinanzierung, makrooekonomie) mit präziser Definition und DACH-Praxisbeispiel.

Antworte ausschliesslich mit einem JSON-Objekt, kein Markdown, keine Erklaerung:
{"sections":[{"icon":"📈","title":"Finanzmärkte","summary":"...","callout":"...","source":"..."}],"glossary":[{"term":"...","definition":"..."}],"learning_terms":[{"learning_path":"finance_fundamentals","term":"...","definition":"...","example":"..."}]}`

const SNAPSHOT_PROMPT = (date: string) => `Heute ist ${date}. Recherchiere aktuelle Marktdaten und liefere nur dieses JSON, kein Markdown:
{"zins_countdown":{"fed_date":"YYYY-MM-DD","ezb_date":"YYYY-MM-DD","fed_consensus":"z.B. Pause oder +25bp","ezb_consensus":"z.B. -25bp"},"makro_kalender":[{"event":"CPI USA","date":"YYYY-MM-DD","previous":"3.2%","expected":"3.1%"}],"earnings_watch":[{"company":"Apple","date":"YYYY-MM-DD","expected_eps":"$1.45"}],"sentiment_ampel":{"vix":18.5,"level":"ruhig","label":"Märkte ruhig, VIX unter 20"},"geo_risiko":[{"region":"Naher Osten","status":"Erhöhte Risikowahrnehmung, begrenzte direkte Marktauswirkung"}]}`

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const date = today()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('daily_briefing').select('id').eq('date', date).maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Briefing wurde heute bereits generiert.' })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Briefing with live web search
  const briefingMsg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{ role: 'user', content: BRIEFING_PROMPT(date) }],
  })

  const rawText = briefingMsg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const briefingData = extractJson(rawText)
  if (!briefingData) {
    return NextResponse.json({
      error: 'JSON konnte nicht extrahiert werden',
      preview: rawText.slice(0, 400),
    }, { status: 500 })
  }

  const { error: briefingErr } = await admin.from('daily_briefing').insert({
    date, sections: briefingData.sections ?? [], glossary: briefingData.glossary ?? [],
  })
  if (briefingErr) return NextResponse.json({ error: briefingErr.message }, { status: 500 })

  if (Array.isArray(briefingData.learning_terms) && briefingData.learning_terms.length > 0) {
    await admin.from('learning_terms').insert(
      (briefingData.learning_terms as Array<Record<string, unknown>>).map(t => ({ ...t, date }))
    )
  }

  // Market snapshot with live web search
  const snapMsg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{ role: 'user', content: SNAPSHOT_PROMPT(date) }],
  })

  const snapRaw = snapMsg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
  const snapshotData = extractJson(snapRaw)

  if (snapshotData) {
    await admin.from('market_drivers_snapshot').upsert({
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
