-- ============================================================
-- Buchhaltung — Rechnungen, Angebote, Belege
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- Documents: invoices ("invoice") and quotes ("quote")
create table if not exists public.accounting_documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  doc_type         text not null check (doc_type in ('invoice', 'quote')),
  doc_number       text not null,

  client_name      text not null,
  client_address   text,
  client_email     text,

  issue_date       date not null default current_date,
  due_date         date,

  line_items       jsonb not null default '[]', -- [{description, qty, unit_price}]
  tax_rate         numeric not null default 20,

  notes            text,
  status           text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),

  pdf_path         text, -- path in storage bucket "accounting"

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_accdocs_user_type on public.accounting_documents(user_id, doc_type);
create index if not exists idx_accdocs_user_issued on public.accounting_documents(user_id, issue_date desc);

alter table public.accounting_documents enable row level security;

drop policy if exists "Users access own accounting documents" on public.accounting_documents;
create policy "Users access own accounting documents"
  on public.accounting_documents
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Receipts / expenses (Barrechnungen, Eingangsbelege, sonstige Ausgaben)
create table if not exists public.accounting_receipts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  receipt_type     text not null check (receipt_type in ('expense', 'cash', 'income_other')),
  vendor           text,
  amount           numeric not null,
  date             date not null default current_date,
  category         text,
  notes            text,

  file_path        text, -- path in storage bucket "accounting"
  ocr_raw          text, -- raw extracted text from vision OCR, for reference

  created_at       timestamptz not null default now()
);

create index if not exists idx_accreceipts_user_date on public.accounting_receipts(user_id, date desc);

alter table public.accounting_receipts enable row level security;

drop policy if exists "Users access own accounting receipts" on public.accounting_receipts;
create policy "Users access own accounting receipts"
  on public.accounting_receipts
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime (optional, mirrors leads table setup)
alter publication supabase_realtime add table public.accounting_documents;
alter publication supabase_realtime add table public.accounting_receipts;

-- ============================================================
-- Storage bucket — run in Supabase Dashboard → Storage if the
-- statements below are not permitted from the SQL editor:
--   1. Create a new PRIVATE bucket named "accounting"
--   2. Add a storage policy so users can only access their own
--      files (path convention: <user_id>/...):
-- ============================================================
insert into storage.buckets (id, name, public)
values ('accounting', 'accounting', false)
on conflict (id) do nothing;

drop policy if exists "Users access own accounting files" on storage.objects;
create policy "Users access own accounting files"
  on storage.objects
  for all
  using (bucket_id = 'accounting' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'accounting' and auth.uid()::text = (storage.foldername(name))[1]);
