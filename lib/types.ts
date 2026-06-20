export type LeadStatus =
  | 'NEU'
  | 'VERKAUFSGESPRÄCH'
  | 'FOLLOW UP'
  | 'CLOSING CALL'
  | 'ABSCHLUSS'
  | 'KEIN INTERESSE'
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
  handler?: string
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

/* ── Buchhaltung ──────────────────────────────────────────── */

export type DocType = 'invoice' | 'quote'
export type DocStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type DocLanguage = 'de' | 'en'

export interface LineItem {
  description: string
  qty: number
  unit_price: number
  duration?: string
}

export interface AccountingCustomer {
  id: string
  user_id: string
  name: string
  contact_person?: string
  address?: string
  country?: string
  vat_number?: string
  vat_liable?: boolean
  email?: string
  phone?: string
  website?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AccountingDocument {
  id: string
  user_id: string
  doc_type: DocType
  doc_number: string
  customer_id?: string | null
  client_name: string
  client_address?: string
  client_email?: string
  client_country?: string
  client_vat?: string
  issue_date: string
  service_date?: string
  due_date?: string
  line_items: LineItem[]
  tax_rate: number
  notes?: string
  status: DocStatus
  language: DocLanguage
  pdf_path?: string
  created_at: string
  updated_at: string
}

export type ReceiptType = 'expense' | 'cash' | 'income_other'

export interface AccountingReceipt {
  id: string
  user_id: string
  receipt_type: ReceiptType
  vendor?: string
  amount: number
  date: string
  category?: string
  notes?: string
  file_path?: string
  ocr_raw?: string
  created_at: string
}
