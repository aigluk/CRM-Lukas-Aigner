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

/**
 * Firmenbuch (AT) über opendata.host: liefert Firmenname, FN, Status und Geschäftsanschrift.
 * Geschäftsführer liefert diese Schnittstelle NICHT, die kommen aus dem Impressum.
 * Mit FN (aus dem Impressum) wird exakt gesucht, sonst per Namensanfang.
 */
async function lookupFirmenbuch(companyName: string, fn: string | null, apiKey: string): Promise<{ address: string | null; fn: string | null; officialName: string | null } | null> {
  if (!apiKey) return null
  try {
    const basicAuth = Buffer.from(`${apiKey}:`).toString('base64')
    const params = new URLSearchParams({ country: 'at', 'reg-no-class': 'at-fb', limit: '5' })
    if (fn) params.set('reg-no', fn.toLowerCase())
    else params.set('company-name', companyName)
    const r = await fetch(`https://api.opendata.host/1.0/registered-companies/find?${params}`, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) return null
    const data = await r.json()
    if (!data.companies?.length) return null
    // Ohne FN nur übernehmen, wenn der Name eindeutig passt (sonst falsche Firma)
    const norm = (x: string) => x.toLowerCase().replace(/[^a-zäöüß0-9]/g, '')
    const company = fn
      ? data.companies[0]
      : data.companies.find((c: any) => c['reg-status'] === 'registered' && norm(c['business-name'] ?? '').startsWith(norm(companyName).slice(0, 12)))
    if (!company || company['reg-status'] !== 'registered') return null
    const addr = company['business-address'] ?? {}
    const street = [addr['street-address'], addr['street-number']].filter(Boolean).join(' ')
    const cityPart = [addr['postal-code'], addr.city].filter(Boolean).join(' ')
    const fullAddress = [street, cityPart].filter(Boolean).join(', ')
    return {
      address: fullAddress || null,
      fn: company['reg-no'] ? `FN ${company['reg-no']}` : null,
      officialName: company['business-name'] ?? null,
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
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-/().]/g, '')
}

function isAustrianMobile(phone: string): boolean {
  const n = normalizePhone(phone)
  return /^(06|\+436|00436)/.test(n)
}

const FN_REGEX = /\bFN\s*[:.]?\s*(\d{1,6}\s?[a-z])\b/i
const PHONE_REGEX = /(?:\+|00)?\d[\d\s/().-]{7,}\d/g
const IMPRESSUM_LINK = /href=["']([^"'#]*(?:impressum|imprint|legal-notice|kontakt|contact)[^"']*)["']/gi

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)', Accept: 'text/html' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

/** Plausibler Personenname: 2 bis 5 Wörter, nur Buchstaben, keine Sätze. */
function cleanPersonName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const n = raw.replace(/^(herr|frau|mag\.?|dr\.?|ing\.?|di\.?|dipl\.-ing\.?|bsc|msc|mba)\s+/gi, '').trim()
  if (/^(leer|none|keine|n\/a|unbekannt|-)$/i.test(n)) return null
  if (/[:;!?*]|\d/.test(n)) return null
  const words = n.split(/\s+/)
  if (words.length < 2 || words.length > 5) return null
  if (!words.every(w => /^[A-ZÄÖÜ][\p{L}'.-]*$/u.test(w))) return null
  return n
}

type WebEnrichment = {
  ceo: string | null
  ceoPhone: string | null
  ceoEmail: string | null
  email: string | null
  phone: string | null
  fn: string | null
}

/**
 * Liest Startseite + Impressum/Kontakt. Das Impressum ist in AT/DE gesetzlich
 * vorgeschrieben (§ 5 ECG, § 14 UGB) und die genaueste Quelle für Firmendaten.
 */
async function enrichWithWebsite(website: string | null): Promise<WebEnrichment | null> {
  if (!website) return null
  const homeHtml = await fetchHtml(website)
  if (!homeHtml) return null

  // Impressum- und Kontaktseiten finden (max. 2)
  const links: string[] = []
  for (const m of homeHtml.matchAll(IMPRESSUM_LINK)) {
    try {
      const u = new URL(m[1], website)
      if (u.hostname.replace(/^www\./, '') !== new URL(website).hostname.replace(/^www\./, '')) continue
      if (!links.includes(u.toString())) links.push(u.toString())
    } catch {}
  }
  links.sort((a, b) => (/impressum|imprint/i.test(b) ? 1 : 0) - (/impressum|imprint/i.test(a) ? 1 : 0))
  const subPages = (await Promise.all(links.slice(0, 2).map(fetchHtml))).filter(Boolean) as string[]

  const homeText = extractText(homeHtml)
  const subText = subPages.map(extractText).join('\n---\n')
  const allText = `${subText}\n---\n${homeText}`

  // Deterministisch: FN-Nummer direkt per Regex (zuverlässiger als KI)
  const fnMatch = allText.match(FN_REGEX)
  const fn = fnMatch ? fnMatch[1].replace(/\s/g, '').toLowerCase() : null

  const result: WebEnrichment = { ceo: null, ceoPhone: null, ceoEmail: null, email: null, phone: null, fn }

  // Deterministisch aus dem Impressum (funktioniert auch ohne KI)
  const src = subText || homeText
  const gfMatch = src.match(/(?:Geschäftsführ(?:er|erin|ung)|Inhaber(?:in)?|Managing Director|CEO|Vertretungsbefugt(?:e|er)?)\s*(?:\([^)]*\))?\s*[:\-]?\s*((?:(?:Mag|Dr|Ing|DI|Dipl\.-Ing|BSc|MSc|MBA)\.?\s+)*[A-ZÄÖÜ][\p{L}'-]+(?:\s+[A-ZÄÖÜ][\p{L}'.-]+){1,3})/u)
  if (gfMatch) result.ceo = cleanPersonName(gfMatch[1].split(/\s+(?:Tel|Telefon|E-Mail|Email|Mail|UID|FN|Firmenbuch|Sitz|Adresse)\b/i)[0])
  const telMatch = src.match(/(?:Tel(?:efon)?|Phone|T)\.?\s*[:.]?\s*((?:\+|00)?\d[\d\s/()-]{6,}\d)/i)
  if (telMatch) {
    const tokens = telMatch[1].trim().split(/\s+/)
    while (tokens.length > 2 && tokens[tokens.length - 1].length === 1 && tokens[tokens.length - 2].length === 1) tokens.pop()
    const tel = tokens.join(' ')
    if (tel.replace(/\D/g, '').length >= 7 && tel.replace(/\D/g, '').length <= 15) result.phone = tel
  }
  // E-Mail: zuerst mailto-Links (Impressum vor Startseite), dann Text
  const domain = new URL(website).hostname.replace(/^www\./, '')
  const mailtos = [...subPages, homeHtml]
    .flatMap(h => [...h.matchAll(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g)].map(m => m[1].toLowerCase()))
  const textMails = (allText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []).map(m => m.toLowerCase())
  const mails = [...new Set([...mailtos, ...textMails])].filter(m => EMAIL_REGEX.test(m) && !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(m))
  result.email = mails.find(m => m.endsWith(domain) && GENERIC_PREFIX.test(m)) ?? mails.find(m => m.endsWith(domain)) ?? mails[0] ?? null
  if (result.ceo) {
    const last = result.ceo.split(/\s+/).pop()!.toLowerCase()
    const first = result.ceo.split(/\s+/)[0].toLowerCase()
    result.ceoEmail = mails.find(m => { const local = m.split('@')[0]; return !GENERIC_PREFIX.test(m) && (local.includes(last) || local.startsWith(first)) }) ?? null
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey || allText.length < 80) return result

  const prompt = `Du bekommst Text aus Impressum, Kontaktseite und Startseite einer Firmenwebsite.
Extrahiere NUR Angaben, die wörtlich im Text stehen. Erfinde nichts. Wenn etwas fehlt: null.

Antworte ausschließlich mit JSON in dieser Form:
{"ceo": "Vorname Nachname des Geschäftsführers/Inhabers oder null",
 "ceo_phone": "Telefonnummer, die ausdrücklich dem Geschäftsführer/Inhaber zugeordnet ist, oder null",
 "ceo_email": "E-Mail, die ausdrücklich dem Geschäftsführer/Inhaber gehört, oder null",
 "email": "allgemeine Firmen-E-Mail aus dem Impressum oder null",
 "phone": "allgemeine Firmen-Telefonnummer aus dem Impressum oder null"}

Text:
${allText.slice(0, 6000)}`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12000),
    })
    if (!aiRes.ok) return result
    const aiData = await aiRes.json()
    const text: string = aiData.content?.[0]?.text ?? ''
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))

    // Nur übernehmen, was wirklich im Text vorkommt (Schutz gegen erfundene Werte)
    const digits = (x: string) => x.replace(/\D/g, '')
    const textDigits = digits(allText)
    const inText = (v: unknown) => typeof v === 'string' && v.trim() && allText.toLowerCase().includes(v.trim().toLowerCase())
    const phoneInText = (v: unknown) => typeof v === 'string' && digits(v).length >= 7 && textDigits.includes(digits(v).slice(-7))

    result.ceo      = (inText(json.ceo) ? cleanPersonName(json.ceo) : null) ?? result.ceo
    result.ceoPhone = phoneInText(json.ceo_phone) ? String(json.ceo_phone).trim() : null
    result.ceoEmail = (inText(json.ceo_email) && EMAIL_REGEX.test(String(json.ceo_email).trim()) ? String(json.ceo_email).trim().toLowerCase() : null) ?? result.ceoEmail
    result.email    = (inText(json.email) && EMAIL_REGEX.test(String(json.email).trim()) ? String(json.email).trim().toLowerCase() : null) ?? result.email
    result.phone    = (phoneInText(json.phone) ? String(json.phone).trim() : null) ?? result.phone
  } catch { /* KI-Antwort unbrauchbar: nur deterministische Werte behalten */ }

  return result
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
  const opendataKey   = process.env.OPENDATA_HOST_API_KEY ?? ''

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

  // Anreicherung pro Lead: erst Website + Impressum, dann Firmenbuch (exakt per FN, wenn gefunden)
  await Promise.all(leads.map(async (lead: any) => {
    const web = await enrichWithWebsite(lead.website)
    const fb = cc === 'AT' ? await lookupFirmenbuch(lead.name, web?.fn ?? null, opendataKey) : null
    const sources: string[] = []

    if (fb) {
      if (fb.address) lead.region = fb.address
      sources.push(`Firmenbuch ${fb.fn ?? ''}`.trim())
    } else if (web?.fn) {
      sources.push(`FN ${web.fn}`)
    }
    if (web) {
      const name = cleanPersonName(lead.ceos) ?? web.ceo
      lead.ceos = name ?? null
      if (!lead.email && web.email) { lead.email = web.email; lead.email_general = web.email }
      if (web.ceoEmail && web.ceoEmail !== lead.email) lead.email_ceo = web.ceoEmail
      if (!lead.phone && web.phone) lead.phone = web.phone
      const direct = web.ceoPhone
      if (direct && !(lead.phone && normalizePhone(direct) === normalizePhone(lead.phone))) {
        if (isAustrianMobile(direct)) {
          lead.notes = `Firmennummer: ${lead.phone}${lead.notes ? `\n${lead.notes}` : ''}`
          lead.phone = direct
        } else {
          lead.notes = `Direktnummer GF: ${direct}${lead.notes ? `\n${lead.notes}` : ''}`
        }
      }
      if (web.ceo || web.email || web.phone) sources.push('Impressum')
    } else {
      lead.ceos = cleanPersonName(lead.ceos)
    }
    if (sources.length) lead.notes = `Quelle: ${sources.join(', ')}${lead.notes ? `\n${lead.notes}` : ''}`
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
