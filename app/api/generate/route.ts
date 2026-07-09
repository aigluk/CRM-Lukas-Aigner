import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { BRANCH_SEARCH_MAP } from '@/lib/constants'
import { stripEmoji } from '@/lib/utils'
import { getWorkspaceOwnerId } from '@/lib/workspace'

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

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-/().]/g, '')
}

function isAustrianMobile(phone: string): boolean {
  const n = normalizePhone(phone)
  return /^(06|\+436|00436)/.test(n)
}

async function enrichWithWebsite(website: string | null): Promise<{ phone: string | null; ceo: string | null } | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!website || !anthropicKey) return null
  try {
    // Fetch website HTML (follows redirects by default)
    const siteRes = await fetch(website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)', Accept: 'text/html' },
      signal: AbortSignal.timeout(4000),
    })
    if (!siteRes.ok) return null
    const html = await siteRes.text()
    const websiteText = extractText(html)
    if (websiteText.length < 100) return null

    // Extract CEO name + direct phone via Claude
    const prompt = `Analysiere diese Firmenwebsite und extrahiere NUR:
1. Die direkte Telefonnummer oder Mobilnummer des Geschäftsführers/Inhabers/CEO (NICHT die allgemeine Firmennummer)
2. Den vollständigen Namen des Geschäftsführers/Inhabers/CEO (nur wenn klar erkennbar)

Antworte im Format:
PHONE: [Nummer oder leer]
CEO: [Name oder leer]

Wenn keine Direktnummer gefunden, lass PHONE leer. Nur echte persönliche Nummern angeben.

Website-Inhalt:
${websiteText}`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!aiRes.ok) return null
    const aiData = await aiRes.json()
    const text: string = aiData.content?.[0]?.text ?? ''

    const phoneMatch = text.match(/PHONE:\s*(.+)/i)
    const ceoMatch   = text.match(/CEO:\s*(.+)/i)

    let phone = phoneMatch?.[1]?.trim() || null
    if (phone && phone.replace(/\D/g, '').length < 6) phone = null

    let ceo = ceoMatch?.[1]?.trim() || null
    if (ceo && (/^(leer|none|keine|n\/a)/i.test(ceo) || ceo.split(/\s+/).length < 2)) ceo = null

    if (!phone && !ceo) return null
    return { phone, ceo }
  } catch { return null }
}

// Country code to German country name for precise Google Maps locations
const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Österreich',
  DE: 'Deutschland',
  CH: 'Schweiz',
  AE: 'Vereinigte Arabische Emirate',
  CY: 'Zypern',
  ES: 'Spanien',
  US: 'USA',
}

async function expandCategoryWithAI(category: string): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return [category]
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: `Du bist ein erfahrener Vertriebler der Firmen auf Google Maps sucht. Für die Kategorie "${category}" gib mir genau 2-3 präzise deutsche Google Maps Suchbegriffe die ein Vertriebler verwenden würde um solche Firmen zu finden. Nur die Begriffe kommagetrennt, keine Erklärung, kein Satz.`,
        }],
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return [category]
    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    const terms = text.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 1).slice(0, 3)
    return terms.length > 0 ? terms : [category]
  } catch { return [category] }
}

class OutscraperError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function queryOutscraper(
  searchTerm: string,
  location: string,
  radius: string,
  countryCode: string,
  apiKey: string
): Promise<any[]> {
  const query = `${searchTerm}, ${location}`
  const params = new URLSearchParams({
    query,
    limit: '10',
    language: 'de',
    region: countryCode,
    async: 'false',
  })
  // Radius applies to ALL locations (predefined cities and custom input)
  if (radius && radius !== '0') {
    params.append('radius', String(Number(radius) * 1000))
  }
  params.append('enrichment', 'domains_service')

  const apiRes = await fetch(`https://api.outscraper.com/google-maps-search?${params}`, {
    headers: { 'X-API-KEY': apiKey, Accept: 'application/json' },
  })
  const rawText = await apiRes.text()
  let apiData: any
  try { apiData = JSON.parse(rawText) } catch {
    if (/insufficient|credit|quota|limit|balance/i.test(rawText))
      throw new OutscraperError('Outscraper Credits aufgebraucht. Bitte Guthaben aufladen.', 402)
    throw new OutscraperError(`Outscraper Fehler: ${rawText.slice(0, 120)}`, 502)
  }
  if (!apiRes.ok) {
    if (apiRes.status === 402 || /insufficient|credit|quota|limit|balance/i.test(rawText))
      throw new OutscraperError('Outscraper Credits aufgebraucht. Bitte Guthaben aufladen.', 402)
    throw new OutscraperError(`Outscraper Fehler (${apiRes.status})`, apiRes.status)
  }
  return Array.isArray(apiData.data?.[0]) ? apiData.data[0] : (apiData.data ?? [])
}

function deduplicatePlaces(places: any[]): any[] {
  const seen = new Set<string>()
  return places.filter(p => {
    const key = p.place_id || `${p.name?.toLowerCase().trim()}|${p.city?.toLowerCase().trim()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const opendataKey   = process.env.OPENDATA_HOST_API_KEY ?? 'F6F1-D72F-7FEF-468A-82AC-B620-3091-B593'

  if (!outscraperKey) return NextResponse.json({ error: 'Outscraper API Key fehlt.' }, { status: 500 })

  const { branches, custom, radius, countryCode, excludedNames } = await req.json()
  if (!branches) return NextResponse.json({ error: 'Branches Parameter fehlt.' }, { status: 400 })
  const excludedSet = new Set<string>(
    Array.isArray(excludedNames) ? excludedNames.map((n: string) => n.toLowerCase().trim()) : []
  )

  const branchList = (branches as string).split(',').map(b => b.trim())

  // Build the term pool like a salesperson: multiple related Google Maps searches
  // per category. For known categories use predefined terms; for custom ones
  // expand intelligently via Claude AI. Max 2 parallel queries (cost control).
  const termArrays = await Promise.all(
    branchList.map(b => BRANCH_SEARCH_MAP[b] ? Promise.resolve(BRANCH_SEARCH_MAP[b]) : expandCategoryWithAI(b))
  )
  const termPool = termArrays.flat()
  const searchTerms = Array.from(new Set(termPool)).slice(0, 2)

  const cc = typeof countryCode === 'string' && countryCode.trim()
    ? countryCode.trim().toUpperCase()
    : 'AT'
  const countryName = COUNTRY_NAMES[cc]

  // Precise location: "München, Deutschland" instead of just "München"
  const baseLocation = custom || countryName || 'Österreich'
  const location = countryName && baseLocation !== countryName
    ? `${baseLocation}, ${countryName}`
    : baseLocation

  const query = searchTerms.map(t => `${t}, ${location}`).join(' | ')

  // Up to 2 parallel Outscraper queries, combined + deduplicated
  let places: any[] = []
  try {
    const results = await Promise.all(
      searchTerms.map(term => queryOutscraper(term, location, radius, cc, outscraperKey))
    )
    places = deduplicatePlaces(results.flat())
  } catch (err: any) {
    if (err instanceof OutscraperError)
      return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: `Netzwerk-Fehler: ${err.message}` }, { status: 500 })
  }

  // Filter out already-seen places (re-generate with same criteria returns new leads)
  if (excludedSet.size > 0) {
    places = places.filter(p => !excludedSet.has((p.name ?? '').toLowerCase().trim()))
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

  // Parallel enrichment: Firmenbuch + Website (Claude) laufen pro Lead gleichzeitig
  await Promise.all(leads.map(async (lead: any) => {
    const [fb, web] = await Promise.all([
      lookupFirmenbuch(lead.name, opendataKey),
      enrichWithWebsite(lead.website),
    ])
    if (fb) {
      if (fb.address) lead.region = fb.address
      if (fb.ceo && fb.ceo.split(/\s+/).length >= 2 && !lead.ceos) lead.ceos = fb.ceo
    }
    if (web) {
      if (web.ceo && !lead.ceos) lead.ceos = web.ceo
      if (web.phone) {
        const samePhone = lead.phone && normalizePhone(web.phone) === normalizePhone(lead.phone)
        if (!samePhone) {
          if (isAustrianMobile(web.phone)) {
            // Österreichische Mobilnummer = sehr wahrscheinlich Direktnummer des Inhabers
            lead.phone = web.phone
          } else {
            lead.notes = `Direktnummer: ${web.phone}${lead.notes ? `\n${lead.notes}` : ''}`
          }
        }
      }
    }
  }))

  const ceoFound   = leads.filter((l: any) => l.ceos).length
  const emailFound = leads.filter((l: any) => l.email).length

  // Mark duplicates: check which leads already exist in DB
  try {
    const ownerId = await getWorkspaceOwnerId(user.id)
    const { data: existing } = await supabase
      .from('leads')
      .select('name, website')
      .eq('user_id', ownerId)
    if (existing?.length) {
      const existingKeys = new Set(existing.map((e: any) => {
        const name = (e.name ?? '').toLowerCase().trim()
        const web  = (e.website ?? '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase().trim()
        return web ? `${name}|${web}` : name
      }))
      leads.forEach((l: any) => {
        const name = (l.name ?? '').toLowerCase().trim()
        const web  = (l.website ?? '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase().trim()
        l.isDuplicate = existingKeys.has(web ? `${name}|${web}` : name)
      })
    }
  } catch { /* non-fatal, skip duplicate marking */ }

  return NextResponse.json({ leads, total: leads.length, ceoFound, emailFound, query })
}
