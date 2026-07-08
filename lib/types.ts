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
  phone_direct?: string
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
  appointment_type?: string
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
  details?: string
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
  gisa_number?: string
  entity_type?: PartnerEntityType
  email?: string
  phone?: string
  website?: string
  notes?: string
  created_at: string
  updated_at: string
}

export type PartnerEntityType = 'unternehmen' | 'kleinunternehmer' | 'einzelunternehmer'

export interface AccountingPartner {
  id: string
  user_id: string
  name: string
  contact_person?: string
  address?: string
  country?: string
  vat_number?: string
  vat_liable?: boolean
  gisa_number?: string
  entity_type?: PartnerEntityType
  email?: string
  phone?: string
  website?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AccountingSalesPartner {
  id: string
  user_id: string
  name: string
  contact_person?: string
  address?: string
  country?: string
  vat_number?: string
  vat_liable?: boolean
  gisa_number?: string
  entity_type?: PartnerEntityType
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
  linked_quote_id?: string | null
  linked_quote_number?: string
  linked_quote_date?: string
  is_imported?: boolean
  pdf_path?: string
  created_at: string
  updated_at: string
}

export type SalaryEntryType = 'employment' | 'gf_salary'

export interface AccountingSalaryEntry {
  id: string
  user_id: string
  reference_number?: string
  employer_name: string
  gross_amount: number
  tax_withheld: number
  period_year: number
  issue_date?: string
  entry_type: SalaryEntryType
  notes?: string
  file_path?: string
  created_at: string
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

export type SubscriptionInterval = 'monthly' | 'quarterly' | 'yearly'

export interface PriceHistoryEntry {
  id: string
  effective_from: string
  amount: number
  note?: string
}

export interface AccountingSubscription {
  id: string
  user_id: string
  name: string
  amount: number
  interval: SubscriptionInterval
  start_date: string
  active: boolean
  notes?: string
  price_history: PriceHistoryEntry[]
  created_at: string
}

/* ── Verträge ─────────────────────────────────────────────── */

export type ContractType = 'service' | 'fulfillment' | 'agent'
export type ContractStatus = 'draft' | 'active' | 'terminated'

export interface AccountingContract {
  id: string
  user_id: string
  contract_type: ContractType
  contract_number: string
  status: ContractStatus
  language: DocLanguage
  customer_id?: string | null
  partner_id?: string | null
  sales_partner_id?: string | null
  party_name: string
  party_address?: string
  party_email?: string
  party_phone?: string
  party_birthdate?: string
  party_vat_number?: string
  party_gisa_number?: string
  package_name?: string
  package_price?: string
  payment_mode?: string
  term_months?: number
  start_date?: string
  notes?: string
  linked_quote_id?: string | null
  linked_quote_number?: string
  linked_quote_date?: string
  pdf_path?: string
  created_at: string
  updated_at: string
}
