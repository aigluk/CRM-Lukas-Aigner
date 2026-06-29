-- ============================================================
-- Verträge & Rechnungen: Referenz auf zugehöriges Angebot
-- (für rechtliche Bestimmtheit statt generischer Formulierung)
-- ============================================================

alter table public.accounting_contracts
  add column if not exists linked_quote_id     uuid references public.accounting_documents(id) on delete set null,
  add column if not exists linked_quote_number  text,
  add column if not exists linked_quote_date    date;

alter table public.accounting_documents
  add column if not exists linked_quote_id     uuid references public.accounting_documents(id) on delete set null,
  add column if not exists linked_quote_number  text,
  add column if not exists linked_quote_date    date;

-- ============================================================
-- Rechnungen: Kennzeichnung für importierte Original-Rechnungen
-- (deren tatsächliche Datei hinterlegt ist statt einer generierten PDF)
-- ============================================================

alter table public.accounting_documents
  add column if not exists is_imported boolean not null default false;
