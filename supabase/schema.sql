-- ============================================================
-- Lukas Aigner CRM — Supabase Schema
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- Leads table
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  -- Core info
  name             text not null,
  ceos             text,
  owner            text,
  industry         text,
  branche          text,
  region           text,
  city             text,
  address          text,
  phone            text,
  email            text,
  email_general    text,
  email_ceo        text,
  website          text,
  linkedin         text,

  -- CRM
  status           text not null default 'NEU',
  status_date      timestamptz default now(),
  note             text,
  notes            text,
  description      text,

  -- Appointment
  appointment_date text,
  appointment_from text,
  appointment_to   text,
  appointment_hour text,

  -- Meta
  rating           numeric,
  reviews          integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_leads_user_status on public.leads(user_id, status);
create index if not exists idx_leads_user_updated on public.leads(user_id, updated_at desc);

-- Row Level Security — users only see their own leads
alter table public.leads enable row level security;

drop policy if exists "Users access own leads" on public.leads;
create policy "Users access own leads"
  on public.leads
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function handle_updated_at();
