-- Add storno (credit note) support to accounting_documents
-- Storno documents reference original invoices and carry negative amounts.

ALTER TABLE public.accounting_documents
  ADD COLUMN IF NOT EXISTS storno_of_number text,   -- original invoice number (e.g. RE-2026-005)
  ADD COLUMN IF NOT EXISTS storno_of_date   text,   -- original invoice issue date (YYYY-MM-DD)
  ADD COLUMN IF NOT EXISTS storno_of_name   text;   -- client name from original (for manual references only)

-- Extend the doc_type check constraint to allow 'storno'
ALTER TABLE public.accounting_documents
  DROP CONSTRAINT IF EXISTS accounting_documents_doc_type_check;

ALTER TABLE public.accounting_documents
  ADD CONSTRAINT accounting_documents_doc_type_check
  CHECK (doc_type IN ('invoice', 'quote', 'storno'));
