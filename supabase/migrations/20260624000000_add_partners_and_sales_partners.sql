-- ============================================================
-- Partner (Agenturpartner/Freelancer) & Vertrieb (Handelsagenten)
-- Eigene Stammdaten-Tabellen, analog zu accounting_customers,
-- damit in der Buchhaltung bei Fulfillment- bzw. Handelsagentenverträgen
-- die richtige Partei aus der jeweils passenden Tabelle ausgewählt werden kann.
-- Run this once in your Supabase SQL Editor
-- ============================================================

create table if not exists public.accounting_partners (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  name             text not null,
  contact_person   text,
  address          text,
  country          text,
  vat_number       text,
  vat_liable       boolean not null default true,
  email            text,
  phone            text,
  website          text,
  notes            text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_accpartners_user on public.accounting_partners(user_id);

alter table public.accounting_partners enable row level security;

drop policy if exists "Users access own accounting partners" on public.accounting_partners;
create policy "Users access own accounting partners"
  on public.accounting_partners
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.accounting_partners;

create table if not exists public.accounting_sales_partners (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  name             text not null,
  contact_person   text,
  address          text,
  country          text,
  vat_number       text,
  vat_liable       boolean not null default true,
  email            text,
  phone            text,
  website          text,
  notes            text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_accsalespartners_user on public.accounting_sales_partners(user_id);

alter table public.accounting_sales_partners enable row level security;

drop policy if exists "Users access own accounting sales partners" on public.accounting_sales_partners;
create policy "Users access own accounting sales partners"
  on public.accounting_sales_partners
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.accounting_sales_partners;

-- Verträge: eigene Referenzspalten für Fulfillment- (Partner) und
-- Handelsagentenverträge (Vertriebspartner), statt nur customer_id.
alter table public.accounting_contracts
  add column if not exists partner_id uuid references public.accounting_partners(id) on delete set null;

alter table public.accounting_contracts
  add column if not exists sales_partner_id uuid references public.accounting_sales_partners(id) on delete set null;
