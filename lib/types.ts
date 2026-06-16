export type LeadStatus =
  | 'NEU'
  | 'ERST KONTAKT'
  | 'VERKAUFSGESPRÄCH'
  | 'ZWEITER KONTAKT'
  | 'CLOSING CALL'
  | 'ABSCHLUSS'
  | 'KEIN INTERESSE'
  | 'BESTANDSKUNDE'
  | 'NO GO'

export interface Lead {
  id: string
  user_id: string
  name: string
  ceos?: string
  owner?: string
  industry?: string
  branche?: string
  region?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  email_general?: string
  email_ceo?: string
  website?: string
  linkedin?: string
  status: LeadStatus
  status_date?: string
  note?: string
  notes?: string
  description?: string
  rating?: number
  reviews?: number
  appointment_date?: string
  appointment_from?: string
  appointment_to?: string
  appointment_hour?: string
  created_at: string
  updated_at: string
}

export type LeadUpdate = Partial<Omit<Lead, 'id' | 'created_at' | 'user_id'>>

export interface GenerateResult {
  leads: Partial<Lead>[]
  total: number
  ceoFound: number
  emailFound: number
  query: string
}
