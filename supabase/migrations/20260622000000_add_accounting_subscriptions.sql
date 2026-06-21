-- ============================================================
-- Buchhaltung - Abos (wiederkehrende Kosten)
-- Run this once in your Supabase SQL Editor
-- ============================================================

create table if not exists public.accounting_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,

  name             text not null,
  amount           numeric not null,
  interval         text not null check (interval in ('monthly', 'quarterly', 'yearly')),
  start_date       date not null default current_date,
  active           boolean not null default true,
  notes            text,

  created_at       timestamptz not null default now()
);

create index if not exists idx_accsubs_user on public.accounting_subscriptions(user_id);

alter table public.accounting_subscriptions enable row level security;

drop policy if exists "Users access own accounting subscriptions" on public.accounting_subscriptions;
create policy "Users access own accounting subscriptions"
  on public.accounting_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.accounting_subscriptions;
