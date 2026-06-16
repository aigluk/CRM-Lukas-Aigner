#!/usr/bin/env node
/**
 * Migration: Vercel KV → Supabase
 * Run: node supabase/migrate-from-kv.mjs
 *
 * Set these env vars before running:
 *   OLD_API_URL   — your old Vercel app URL (e.g. https://lukas-aigner-crm.vercel.app)
 *   OLD_PASSWORD  — your old CRM_PASSWORD
 *   SUPABASE_URL  — your Supabase project URL
 *   SUPABASE_KEY  — your Supabase service_role key (not anon!)
 *   USER_ID       — your Supabase auth.users id (find it in Supabase dashboard)
 */

const OLD_API_URL  = process.env.OLD_API_URL
const OLD_PASSWORD = process.env.OLD_PASSWORD
const SUPA_URL     = process.env.SUPABASE_URL
const SUPA_KEY     = process.env.SUPABASE_KEY
const USER_ID      = process.env.USER_ID

if (!OLD_API_URL || !OLD_PASSWORD || !SUPA_URL || !SUPA_KEY || !USER_ID) {
  console.error('Missing env vars. See script header for required vars.')
  process.exit(1)
}

async function main() {
  // 1. Fetch leads from old KV API
  console.log('Fetching leads from old API...')
  const res = await fetch(`${OLD_API_URL}/api/leads`, {
    headers: { Authorization: `Bearer ${OLD_PASSWORD}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${await res.text()}`)
  const { leads } = await res.json()
  console.log(`Got ${leads.length} leads.`)

  if (!leads.length) { console.log('Nothing to migrate.'); return }

  // 2. Map to new schema
  const rows = leads.map(l => ({
    user_id:          USER_ID,
    name:             l.name,
    ceos:             l.ceos || null,
    owner:            l.owner || null,
    industry:         l.industry || null,
    branche:          l.branche || l.industry || null,
    region:           l.region || null,
    city:             l.city || null,
    address:          l.address || null,
    phone:            l.phone || null,
    email:            l.email || l.email_general || null,
    email_general:    l.email_general || null,
    email_ceo:        l.email_ceo || null,
    website:          l.website || null,
    linkedin:         l.linkedin || null,
    status:           normalizeStatus(l.status),
    status_date:      l.statusDate || l.status_date || new Date().toISOString(),
    note:             l.note || null,
    notes:            l.notes || null,
    description:      l.description || null,
    appointment_date: l.appointmentDate || l.appointment_date || null,
    appointment_from: l.appointmentFrom || l.appointment_from || null,
    appointment_to:   l.appointmentTo   || l.appointment_to   || null,
    appointment_hour: l.appointmentHour || l.appointment_hour || null,
  }))

  // 3. Insert into Supabase in batches of 100
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const r = await fetch(`${SUPA_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
    })
    if (!r.ok) {
      const err = await r.text()
      throw new Error(`Supabase insert failed: ${err}`)
    }
    inserted += batch.length
    console.log(`Inserted ${inserted}/${rows.length}...`)
  }

  console.log(`✓ Migration complete: ${inserted} leads imported.`)
}

function normalizeStatus(s) {
  const v = (s ?? '').toLowerCase()
  if (v.includes('kontakt'))                      return 'IN KONTAKT'
  if (v.includes('termin'))                       return 'TERMIN FIXIERT'
  if (v.includes('abschluss') || v.includes('absage')) return 'ABSCHLUSS / ABSAGE'
  if (v.includes('kein') || v.includes('interesse'))   return 'KEIN INTERESSE'
  if (v.includes('bestand'))                      return 'BESTANDSKUNDE'
  if (v.includes('no go') || v.includes('nogo')) return 'NO GO'
  return 'NEU'
}

main().catch(e => { console.error(e.message); process.exit(1) })
