import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
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

  const briefingResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Recherchiere aktuelle Finanz- und Wirtschaftsnachrichten auf WSJ/NYT/Handelsblatt/FuW-Niveau — konkrete Zahlen (Umsatz, Marge, Kursbewegung in %), nicht nur Schlagzeilen.

Liefere 4 Blöcke:
1. Finanzmärkte (Indizes, Rohstoffe, Währungen)
2. Immobiliensektor DACH (Zinsen, Preise, Regulierung)
3. Weltwirtschaft (Makrodaten, Zentralbanken, Handel)
4. Unternehmen & Aktien (Big Tech / DAX/ATX/SMI-Schwergewichte, relevante Quartalszahlen)

Pro Block: summary (4-5 präzise Sätze mit Zahlen), callout ("Warum das für Immobilienentwickler/Investoren wichtig ist" — konkrete Einordnung), source (Quellenangabe).

Extrahiere alle Fachbegriffe aus deinen Texten als Glossar mit allgemeinverständlichen Definitionen.

Liefere 3 neue Lernbegriffe (einen pro Pfad: finance_fundamentals, immobilienfinanzierung, makrooekonomie) mit Definition und Praxisbeispiel aus dem DACH-Raum.

Antworte NUR als JSON ohne Markdown:
{
  "sections": [{"icon": "📈", "title": "...", "summary": "...", "callout": "...", "source": "..."}],
  "glossary": [{"term": "...", "definition": "..."}],
  "learning_terms": [{"learning_path": "...", "term": "...", "definition": "...", "example": "..."}]
}`,
    }],
  })

  const briefingText = briefingResponse.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const briefingData = parseJsonFromText(briefingText)
  if (!briefingData) {
    return NextResponse.json({ error: 'Fehler beim Parsen der Antwort', raw: briefingText.slice(0, 300) }, { status: 500 })
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

  const snapshotResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Liefere aktuelle strukturierte Marktdaten als JSON:
{
  "zins_countdown": {"fed_date": "YYYY-MM-DD oder null", "ezb_date": "YYYY-MM-DD oder null", "fed_consensus": "z.B. Pause", "ezb_consensus": "z.B. -25bp"},
  "makro_kalender": [{"event": "CPI USA", "date": "YYYY-MM-DD", "previous": "3.2%", "expected": "3.1%"}],
  "earnings_watch": [{"company": "Apple", "date": "YYYY-MM-DD", "expected_eps": "$1.45"}],
  "sentiment_ampel": {"vix": 18.5, "level": "ruhig", "label": "Märkte ruhig, kein Stresssignal"},
  "geo_risiko": [{"region": "...", "status": "1-Satz Einschätzung"}]
}
Nur JSON, kein Markdown.`,
    }],
  })

  const snapshotText = snapshotResponse.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
  const snapshotData = parseJsonFromText(snapshotText)

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
