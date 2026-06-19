import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Anthropic API Key fehlt.' }, { status: 500 })

  const { imageBase64, mediaType } = await req.json()
  if (!imageBase64) return NextResponse.json({ error: 'Kein Bild übergeben.' }, { status: 400 })

  const prompt = `Du bekommst das Foto/Scan eines Belegs, einer Rechnung oder eines Kassenbons. Extrahiere folgende Felder und antworte AUSSCHLIESSLICH mit einem JSON-Objekt, keine Erklärung, kein Markdown:

{
  "vendor": "Name des Unternehmens/Verkäufers oder null",
  "amount": Bruttobetrag als Zahl (z. B. 49.90) oder null,
  "date": "Datum im Format YYYY-MM-DD oder null",
  "category": "kurze Kategorie auf Deutsch (z. B. Büromaterial, Tanken, Bewirtung, Software, Reisekosten) oder null"
}`

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
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'Claude-Fehler' }, { status: 500 })

    const raw = data.content?.[0]?.text ?? '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return NextResponse.json({
      vendor: parsed.vendor ?? null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      date: parsed.date ?? null,
      category: parsed.category ?? null,
      raw,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
