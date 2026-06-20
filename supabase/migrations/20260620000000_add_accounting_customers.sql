-- ============================================================
-- Buchhaltung v2 — Kundenstamm, mehrsprachige Dokumente
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- Kundenstamm: zentrale Kundendaten, wiederverwendbar für Rechnungen/Angebote
create table if not exists public.accounting_customers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  name             text not null,
  address          text,
  country          text,
  vat_number       text,
  email            text,
  phone            text,
  notes            text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_acccustomers_user on public.accounting_customers(user_id);

alter table public.accounting_customers enable row level security;

drop policy if exists "Users access own accounting customers" on public.accounting_customers;
create policy "Users access own accounting customers"
  on public.accounting_customers
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.accounting_customers;

-- Neue Felder auf Rechnungen/Angeboten
alter table public.accounting_documents
  add column if not exists customer_id   uuid references public.accounting_customers(id) on delete set null,
  add column if not exists client_country text,
  add column if not exists client_vat     text,
  add column if not exists service_date  date,
  add column if not exists language      text not null default 'de' check (language in ('de', 'en'));
