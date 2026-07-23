import { NextRequest, NextResponse } from 'next/server'
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
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Professionelles Tages-Briefing für Immobilienentwickler/Investor DACH. Nutze dein aktuelles Wissen.

4 Blöcke mit Zahlen:
1. Finanzmärkte: DAX/ATX/SMI, EUR/USD, EZB/Fed Zinslage, Gold/Öl
2. Immobiliensektor DACH: Bauzinsen, Preisindizes, Regulierung
3. Weltwirtschaft: Inflation, BIP, Zentralbank-Outlook
4. Unternehmen & Aktien: DAX/ATX Schwergewichte, Earnings

Pro Block: summary (4-5 Sätze mit Zahlen), callout (Relevanz für Immobilien-Investoren), source.
Glossar: alle Fachbegriffe mit Definitionen.
3 Lernbegriffe (finance_fundamentals, immobilienfinanzierung, makrooekonomie) mit Definition + DACH-Beispiel.

NUR JSON, kein Text davor/danach:
{"sections":[{"icon":"📈","title":"Finanzmärkte","summary":"...","callout":"...","source":"..."}],"glossary":[{"term":"...","definition":"..."}],"learning_terms":[{"learning_path":"finance_fundamentals","term":"...","definition":"...","example":"..."}]}`,
    }],
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
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Heute ist ${date}. Marktdaten. NUR JSON:
{"zins_countdown":{"fed_date":"2025-09-17","ezb_date":"2025-09-11","fed_consensus":"Pause","ezb_consensus":"-25bp"},"makro_kalender":[{"event":"CPI Eurozone","date":"${date}","previous":"2.3%","expected":"2.2%"}],"earnings_watch":[{"company":"SAP","date":"${date}","expected_eps":"€1.23"}],"sentiment_ampel":{"vix":17.2,"level":"ruhig","label":"Märkte stabil"},"geo_risiko":[{"region":"Naher Osten","status":"Erhöhte Risikowahrnehmung"}]}`,
    }],
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
