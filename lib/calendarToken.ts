import crypto from 'crypto'

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'la-crm-cal'
}

export function generateCalendarToken(ownerId: string): string {
  const mac = crypto.createHmac('sha256', secret()).update(ownerId).digest('hex').slice(0, 24)
  return Buffer.from(`${ownerId}:${mac}`).toString('base64url')
}

export function verifyCalendarToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const sep = decoded.lastIndexOf(':')
    const ownerId = decoded.slice(0, sep)
    const mac = decoded.slice(sep + 1)
    const expected = crypto.createHmac('sha256', secret()).update(ownerId).digest('hex').slice(0, 24)
    return mac === expected ? ownerId : null
  } catch {
    return null
  }
}
