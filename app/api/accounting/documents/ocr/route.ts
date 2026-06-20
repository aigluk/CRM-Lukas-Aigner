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

  const prompt = `Du bekommst den Scan/das Foto einer Rechnung. Extrahiere folgende Felder und antworte AUSSCHLIESSLICH mit einem JSON-Objekt, keine Erklärung, kein Markdown:

{
  "client_name": "Name des Rechnungsempfängers/Kunden oder null",
  "invoice_number": "die auf dem Dokument aufgedruckte Rechnungsnummer als Text oder null",
  "date": "Rechnungsdatum im Format YYYY-MM-DD oder null",
  "amount": Bruttobetrag (Gesamtsumme) als Zahl (z. B. 490.00) oder null
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
      client_name: parsed.client_name ?? null,
      invoice_number: parsed.invoice_number ?? null,
      date: parsed.date ?? null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
