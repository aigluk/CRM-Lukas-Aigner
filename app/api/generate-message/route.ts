import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Anthropic API Key fehlt.' }, { status: 500 })

  const { lead, tone = 'professionell' } = await req.json()
  if (!lead?.name) return NextResponse.json({ error: 'Lead-Daten fehlen.' }, { status: 400 })

  const prompt = `Du bist ein Top-Verkäufer und verfasst eine kurze, ${tone}e LinkedIn-Direktnachricht für einen österreichischen KMU-Lead.

Lead-Daten:
- Unternehmen: ${lead.name}
- Branche: ${lead.branche || lead.industry || 'unbekannt'}
- Ansprechpartner: ${lead.ceos || 'unbekannt'}
- Region: ${lead.city || lead.region || 'Österreich'}
- Beschreibung: ${lead.description || '-'}

Regeln:
- Maximal 3 kurze Absätze
- Persönlich, direkt, kein Marketing-Sprech
- Konkreter Nutzen für das Unternehmen
- Klarer Call-to-Action (kurzes Gespräch)
- Auf Deutsch
- Kein "Sehr geehrte/r" - du/Sie je nach Tonalität
- NUR die Nachricht, kein Betreff, kein "Hier ist die Nachricht:"`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'Claude-Fehler' }, { status: 500 })

    const message = data.content?.[0]?.text ?? ''
    return NextResponse.json({ message })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
