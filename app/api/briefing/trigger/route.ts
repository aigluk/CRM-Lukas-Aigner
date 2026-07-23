import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 120

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

  // Briefing — no web_search to guarantee clean JSON output
  const briefingMsg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Erstelle ein professionelles Tages-Briefing für einen Immobilienentwickler/Investor im DACH-Raum. Nutze dein aktuelles Wissen über Finanzmärkte, Makroökonomie und Immobilien.

4 Blöcke mit konkreten Zahlen und Entwicklungen:
1. Finanzmärkte: DAX/ATX/SMI, EUR/USD, EZB/Fed Zinslage, Gold/Öl
2. Immobiliensektor DACH: Bauzinsen, Preisindizes, regulatorische Entwicklungen
3. Weltwirtschaft: Inflation, BIP, Zentralbank-Outlook, Handelspolitik
4. Unternehmen & Aktien: DAX/ATX Schwergewichte, relevante Earnings

Pro Block: summary (4-5 Sätze, konkrete Zahlen), callout (1-2 Sätze Relevanz für Immobilien-Investoren), source (seriöse Referenz).

Glossar: alle Fachbegriffe aus deinen Texten mit allgemeinverständlichen Definitionen.

3 Lernbegriffe (finance_fundamentals, immobilienfinanzierung, makrooekonomie) mit Definition + DACH-Praxisbeispiel.

Antworte NUR mit diesem JSON, absolut kein Text davor oder danach, kein Markdown:
{"sections":[{"icon":"📈","title":"Finanzmärkte","summary":"...","callout":"...","source":"..."},{"icon":"🏗","title":"Immobiliensektor DACH","summary":"...","callout":"...","source":"..."},{"icon":"🌍","title":"Weltwirtschaft","summary":"...","callout":"...","source":"..."},{"icon":"📊","title":"Unternehmen & Aktien","summary":"...","callout":"...","source":"..."}],"glossary":[{"term":"...","definition":"..."}],"learning_terms":[{"learning_path":"finance_fundamentals","term":"...","definition":"...","example":"..."},{"learning_path":"immobilienfinanzierung","term":"...","definition":"...","example":"..."},{"learning_path":"makrooekonomie","term":"...","definition":"...","example":"..."}]}`,
    }],
  })

  const rawText = briefingMsg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const briefingData = extractJson(rawText)
  if (!briefingData) {
    return NextResponse.json({ error: 'JSON konnte nicht extrahiert werden', preview: rawText.slice(0, 300) }, { status: 500 })
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

  // Market snapshot
  const snapMsg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Marktdaten basierend auf deinem Wissen. NUR JSON, kein Text davor/danach:
{"zins_countdown":{"fed_date":"2025-09-17","ezb_date":"2025-09-11","fed_consensus":"Pause","ezb_consensus":"-25bp"},"makro_kalender":[{"event":"CPI Eurozone","date":"${date}","previous":"2.3%","expected":"2.2%"},{"event":"NFP USA","date":"${date}","previous":"139k","expected":"145k"}],"earnings_watch":[{"company":"SAP","date":"${date}","expected_eps":"€1.23"},{"company":"Siemens","date":"${date}","expected_eps":"€2.45"}],"sentiment_ampel":{"vix":17.2,"level":"ruhig","label":"Märkte stabil, VIX unter 20 — kein Stresssignal"},"geo_risiko":[{"region":"Naher Osten","status":"Erhöhte Risikowahrnehmung, begrenzte direkte Marktauswirkung"},{"region":"Ukraine/Russland","status":"Anhaltend, Rohstoffmärkte bleiben sensibel"}]}`,
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
