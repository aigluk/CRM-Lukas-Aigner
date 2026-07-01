#!/usr/bin/env node
/**
 * Pushes branded email templates to the Supabase project via Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=<your-pat> node scripts/setup-supabase-emails.mjs
 *
 * Get your Personal Access Token at:
 *   https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const PROJECT_REF = 'urncythzfcerfnfozxai'
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!token) {
  console.error('\n❌  SUPABASE_ACCESS_TOKEN is not set.')
  console.error('   Get yours at: https://supabase.com/dashboard/account/tokens')
  console.error('   Then run: SUPABASE_ACCESS_TOKEN=<token> node scripts/setup-supabase-emails.mjs\n')
  process.exit(1)
}

const inviteHtml    = readFileSync(join(root, 'supabase/email-templates/invite.html'), 'utf-8')
const recoveryHtml  = readFileSync(join(root, 'supabase/email-templates/reset_password.html'), 'utf-8')

const payload = {
  mailer_invite_subject:     'Du wurdest zu LA CRM eingeladen',
  invite_template:           inviteHtml,
  mailer_recovery_subject:   'Passwort zurücksetzen – LA CRM',
  recovery_template:         recoveryHtml,
  // Ensure production URL is in the redirect allowlist
  uri_allow_list:            'https://la-crm-one.vercel.app/**',
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

if (!res.ok) {
  const err = await res.text()
  console.error('\n❌  Failed to update Supabase config:')
  console.error('   Status:', res.status)
  console.error('   Response:', err, '\n')
  process.exit(1)
}

console.log('\n✅  Email templates pushed successfully to Supabase!')
console.log('   • Invite template: "Du wurdest zu LA CRM eingeladen"')
console.log('   • Recovery template: "Passwort zurücksetzen – LA CRM"')
console.log('   • Redirect URL allowlist updated: https://la-crm-one.vercel.app/**\n')
