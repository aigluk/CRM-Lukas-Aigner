-- ============================================================
-- Termin-Typ (z. B. "Kundentermin", "Kundencall") fuer Leads,
-- unabhaengig vom Pipeline-Status
-- Run this once in your Supabase SQL Editor
-- ============================================================

alter table public.leads
  add column if not exists appointment_type text;
