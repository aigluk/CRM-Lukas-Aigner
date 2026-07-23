import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// Robust JSON extraction: strips markdown fences, finds balanced braces
function extractJson(raw: string): Record<string, unknown> | null {
  // Strip ```json ... ``` or ``` ... ``` wrappers
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '')

  // Find first { and match balanced braces
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let end = -1
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  if (end === -1) return null

  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const date = today()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('daily_briefing')
    .select('id')
    .eq('date', date)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Briefing wurde heute bereits generiert.' })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // --- Briefing + Learning Terms (no web_search for reliability; uses training knowledge) ---
  const briefingMsg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Erstelle ein professionelles Tages-Briefing für einen Immobilienentwickler und Investor im DACH-Raum.

Liefere 4 Blöcke mit dem aktuellsten Wissensstand (nutze dein Training-Wissen, konkrete Zahlen wo bekannt):
1. Finanzmärkte: DAX/ATX/SMI, EUR/USD, Leitzinsen EZB/Fed, Rohstoffe
2. Immobiliensektor DACH: Zinsen, Preisindizes, regulatorische Entwicklungen
3. Weltwirtschaft: Inflation, BIP-Trends, Zentralbank-Signale, Handelsthemen
4. Unternehmen & Aktien: Big Tech / DAX-Schwergewichte, relevante Quartalszahlen

Pro Block: summary (4-5 Sätze, konkrete Zahlen und Entwicklungen), callout (1-2 Sätze: "Warum das für Immobilienentwickler/Investoren konkret wichtig ist"), source (Referenz-Quelle).

Extrahiere alle Fachbegriffe aus deinen Texten als Glossar mit allgemeinverständlichen Definitionen.

Liefere 3 neue Lernbegriffe (einen pro Pfad: finance_fundamentals, immobilienfinanzierung, makrooekonomie) mit präziser Definition und konkretem DACH-Praxisbeispiel.

WICHTIG: Antworte ausschliesslich mit einem einzigen JSON-Objekt, ohne Markdown-Formatierung, ohne Erklaerungen davor oder danach:
{"sections":[{"icon":"📈","title":"Finanzmärkte","summary":"...","callout":"...","source":"..."}],"glossary":[{"term":"...","definition":"..."}],"learning_terms":[{"learning_path":"finance_fundamentals","term":"...","definition":"...","example":"..."}]}`,
    }],
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
    date,
    sections: briefingData.sections ?? [],
    glossary: briefingData.glossary ?? [],
  })
  if (briefingErr) return NextResponse.json({ error: briefingErr.message }, { status: 500 })

  if (Array.isArray(briefingData.learning_terms) && briefingData.learning_terms.length > 0) {
    await admin.from('learning_terms').insert(
      (briefingData.learning_terms as Array<Record<string, unknown>>).map(t => ({ ...t, date }))
    )
  }

  // --- Market snapshot (Haiku, fast) ---
  const snapMsg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Liefere kompakte Marktdaten als JSON (nutze Training-Wissen, realistisch geschätzt).

Antworte nur mit diesem JSON, ohne Markdown:
{"zins_countdown":{"fed_date":"YYYY-MM-DD","ezb_date":"YYYY-MM-DD","fed_consensus":"z.B. Pause oder +25bp","ezb_consensus":"z.B. -25bp"},"makro_kalender":[{"event":"CPI USA","date":"YYYY-MM-DD","previous":"3.2%","expected":"3.1%"}],"earnings_watch":[{"company":"Apple","date":"YYYY-MM-DD","expected_eps":"$1.45"}],"sentiment_ampel":{"vix":18.5,"level":"ruhig","label":"Märkte ruhig"},"geo_risiko":[{"region":"Naher Osten","status":"Erhöhte Risikowahrnehmung, begrenzte Marktauswirkung"}]}`,
    }],
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
