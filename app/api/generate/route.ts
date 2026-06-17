import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { BRANCH_SEARCH_MAP } from '@/lib/constants'
import { stripEmoji } from '@/lib/utils'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
const GENERIC_PREFIX = /^(info|office|kontakt|contact|hello|hallo|support|service|mail|team|post|anfrage|booking|reservation|sales|hr|buchhaltung|verwaltung|sekretariat|empfang|reception|marketing|noreply|no-reply|jobs|karriere)@/i
const CEO_TITLE_REGEX = /\b(ceo|chief executive|geschäftsführer|geschäftsführerin|gf\b|inhaber|inhaberin|founder|co-founder|gründer|owner|direktor|vorstand|managing director|president)\b/i

function getMainDomain(url?: string | null): string | null {
  if (!url) return null
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    return host.replace(/^www\./, '')
  } catch { return null }
}

function extractPersonData(place: any) {
  const websiteDomain = getMainDomain(place.website)
  const websiteDomainBase = websiteDomain ? websiteDomain.split('.').slice(0, -1).join('.') : null
  const contacts: any[] = []

  for (let i = 1; i <= 30; i++) {
    const email = place[`email_${i}`]
    if (!email) break
    const emailStr = typeof email === 'string' ? email.toLowerCase().trim() : ''
    if (!EMAIL_REGEX.test(emailStr)) continue
    const emailDomain = emailStr.split('@')[1] ?? ''
    const emailDomainBase = emailDomain.split('.').slice(0, -1).join('.')
    const domainMatch = !!websiteDomain && (
      emailDomain === websiteDomain ||
      emailDomainBase === websiteDomainBase ||
      (websiteDomainBase && emailDomain.includes(websiteDomainBase)) ||
      (websiteDomainBase && websiteDomainBase.includes(emailDomainBase))
    )
    contacts.push({
      email:     emailStr,
      name:      place[`email_${i}_full_name`] ?? null,
      title:     place[`email_${i}_title`] ?? null,
      isGeneric: GENERIC_PREFIX.test(emailStr),
      domainMatch,
    })
  }

  const pool           = contacts.filter(c => c.domainMatch)
  const ceoContact     = pool.find(c => c.title && CEO_TITLE_REGEX.test(c.title) && c.name)
  const generalContact = pool.find(c => c.isGeneric)
  const personalContact = pool.find(c => !c.isGeneric)

  const email_general = generalContact?.email || personalContact?.email || ''
  const email_ceo     = (ceoContact && ceoContact.email !== email_general) ? ceoContact.email : ''

  let ceoName = ''
  if (ceoContact?.name) {
    const n = ceoContact.name.trim()
    const companyLower = (place.name ?? '').toLowerCase()
    if (n.toLowerCase() !== companyLower && n.split(/\s+/).length >= 2) ceoName = n
  }

  return { email_general, email_ceo, ceoName }
}

async function lookupFirmenbuch(companyName: string, apiKey: string): Promise<any> {
  try {
    const basicAuth = Buffer.from(`${apiKey}:`).toString('base64')
    const params = new URLSearchParams({ 'company-name': companyName, country: 'at', limit: '5' })
    const r = await fetch(`https://api.opendata.host/1.0/registered-companies/find?${params}`, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) return null
    const data = await r.json()
    if (!data.companies?.length) return null
    const company = data.companies.find((c: any) => c['reg-status'] === 'registered') ?? data.companies[0]
    const addr = company['business-address'] ?? {}
    const fullAddress = [addr['street-address'], addr['street-number'], addr['postal-code'], addr.city].filter(Boolean).join(', ')
    const gf = (company.officers ?? []).find((o: any) => /(geschäftsführer|gf\b|ceo|inhaber|vorstand)/i.test(o.role ?? ''))
    return {
      address: fullAddress || null,
      ceo: gf ? `${gf['first-name'] ?? ''} ${gf['last-name'] ?? ''}`.trim() : null,
    }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const opendataKey   = process.env.OPENDATA_HOST_API_KEY ?? 'F6F1-D72F-7FEF-468A-82AC-B620-3091-B593'

  if (!outscraperKey) return NextResponse.json({ error: 'Outscraper API Key fehlt.' }, { status: 500 })

  const { branches, custom, radius } = await req.json()
  if (!branches) return NextResponse.json({ error: 'Branches Parameter fehlt.' }, { status: 400 })

  const branchList  = (branches as string).split(',').map(b => b.trim())
  const searchTerms = branchList.map(b => BRANCH_SEARCH_MAP[b] ?? b).join(', ')
  const location    = custom || 'Österreich'
  // Append radius hint to query so Outscraper biases results geographically
  const radiusHint  = radius && radius !== '0' ? ` ${radius}km` : ''
  const query       = `${searchTerms}, ${location}${radiusHint}`

  const params = new URLSearchParams({ query, limit: '15', language: 'de', region: 'AT', async: 'false' })
  // Pass radius in meters to Outscraper when a city-level search is active
  if (radius && radius !== '0' && custom) params.append('radius', String(Number(radius) * 1000))
  params.append('enrichment', 'domains_service')

  // Outscraper Google Maps
  let places: any[] = []
  try {
    const apiRes = await fetch(`https://api.outscraper.com/google-maps-search?${params}`, {
      headers: { 'X-API-KEY': outscraperKey, Accept: 'application/json' },
    })
    const rawText = await apiRes.text()
    let apiData: any
    try { apiData = JSON.parse(rawText) } catch {
      if (/insufficient|credit|quota|limit|balance/i.test(rawText))
        return NextResponse.json({ error: 'Outscraper Credits aufgebraucht.' }, { status: 402 })
      return NextResponse.json({ error: `Outscraper Fehler: ${rawText.slice(0, 120)}` }, { status: 502 })
    }
    if (!apiRes.ok) {
      if (apiRes.status === 402)
        return NextResponse.json({ error: 'Outscraper Credits aufgebraucht.' }, { status: 402 })
      return NextResponse.json({ error: `Outscraper Fehler (${apiRes.status})` }, { status: apiRes.status })
    }
    places = Array.isArray(apiData.data?.[0]) ? apiData.data[0] : (apiData.data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: `Netzwerk-Fehler: ${err.message}` }, { status: 500 })
  }

  if (!places.length) return NextResponse.json({ leads: [], total: 0, ceoFound: 0, emailFound: 0, query })

  // Map to leads
  const leads = places
    .filter(p => p.name && p.business_status !== 'CLOSED_PERMANENTLY')
    .map(place => {
      let website = place.website ?? null
      if (website) {
        try {
          const url = new URL(decodeURIComponent(website))
          ;['utm_source','utm_medium','utm_campaign','gclid','fbclid'].forEach(p => url.searchParams.delete(p))
          website = url.toString()
        } catch {}
      }

      const addressParts = [place.street, place.postal_code, place.city].filter(Boolean)
      const region = addressParts.join(', ') || place.full_address || location

      const { email_general, email_ceo, ceoName } = extractPersonData(place)

      return {
        name:         place.name,
        industry:     branchList[0] ?? '',
        branche:      branchList[0] ?? '',
        region,
        city:         place.city ?? null,
        website,
        phone:        place.phone ?? '',
        email:        email_general,
        email_general,
        email_ceo,
        ceos:         ceoName,
        description:  stripEmoji(place.description || (Array.isArray(place.subtypes) ? place.subtypes.join(', ') : '')),
        status:       'NEU',
        status_date:  new Date().toISOString(),
      }
    })

  // Parallel enrichment: Firmenbuch
  await Promise.all(leads.map(async (lead: any) => {
    const fb = await lookupFirmenbuch(lead.name, opendataKey)
    if (fb) {
      if (fb.address) lead.region = fb.address
      if (fb.ceo && fb.ceo.split(/\s+/).length >= 2 && !lead.ceos) lead.ceos = fb.ceo
    }
  }))

  const ceoFound   = leads.filter((l: any) => l.ceos).length
  const emailFound = leads.filter((l: any) => l.email).length

  return NextResponse.json({ leads, total: leads.length, ceoFound, emailFound, query })
}
