-- ============================================================
-- Verträge: Firmenkennzahl der Gegenseite (UID / GISA-Zahl)
-- statt E-Mail/Telefon im Vertragsparteien-Kopf anzeigen
-- ============================================================

alter table public.accounting_contracts
  add column if not exists party_vat_number  text,
  add column if not exists party_gisa_number text;
