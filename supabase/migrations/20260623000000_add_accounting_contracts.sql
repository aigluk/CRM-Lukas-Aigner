-- ============================================================
-- Buchhaltung v3 — Verträge (Dienstleistung / Fulfillment / Handelsagentur)
-- Run this once in your Supabase SQL Editor
-- ============================================================

create table if not exists public.accounting_contracts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  contract_type    text not null check (contract_type in ('service', 'fulfillment', 'agent')),
  contract_number  text not null,
  status           text not null default 'draft' check (status in ('draft', 'active', 'terminated')),
  language         text not null default 'de' check (language in ('de', 'en')),

  customer_id      uuid references public.accounting_customers(id) on delete set null,
  party_name       text not null,
  party_address    text,
  party_email      text,
  party_phone      text,
  party_birthdate  text,

  package_name     text,
  package_price    text,
  payment_mode     text,
  term_months      integer,
  start_date       date,

  notes            text,
  pdf_path         text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_acccontracts_user on public.accounting_contracts(user_id);
create index if not exists idx_acccontracts_type on public.accounting_contracts(user_id, contract_type);

alter table public.accounting_contracts enable row level security;

drop policy if exists "Users access own accounting contracts" on public.accounting_contracts;
create policy "Users access own accounting contracts"
  on public.accounting_contracts
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.accounting_contracts;
