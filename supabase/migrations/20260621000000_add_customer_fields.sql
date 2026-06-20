-- ============================================================
-- Kundenstamm: Ansprechperson, Webseite, Umsatzsteuerpflicht
-- Run this once in your Supabase SQL Editor
-- ============================================================

alter table public.accounting_customers
  add column if not exists contact_person text,
  add column if not exists website        text,
  add column if not exists vat_liable     boolean not null default true;
