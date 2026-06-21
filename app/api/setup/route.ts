import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MIGRATION_SQL = `-- LA CRM - Datenbank einrichten (einmalig ausführen)
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  ceos             text, owner text, industry text, branche text,
  region text, city text, address text, phone text, email text,
  email_general text, email_ceo text, website text, linkedin text,
  status           text not null default 'NEU',
  status_date      timestamptz default now(),
  note text, notes text, description text,
  appointment_date text, appointment_from text, appointment_to text, appointment_hour text,
  rating numeric, reviews integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_leads_user_status on public.leads(user_id, status);
create index if not exists idx_leads_user_updated on public.leads(user_id, updated_at desc);
alter table public.leads enable row level security;
drop policy if exists "Users access own leads" on public.leads;
create policy "Users access own leads" on public.leads for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function handle_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function handle_updated_at();`

export async function GET() {
  try {
    // check auth
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser().catch(() => ({ data: { user: null } }))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // check if leads table exists
    const { error } = await createAdminClient()
      .from('leads')
      .select('id')
      .limit(1)

    if (error?.code === '42P01') {
      return NextResponse.json({
        setup_required: true,
        sql: MIGRATION_SQL,
        dashboard_url: `https://supabase.com/dashboard/project/urncythzfcerfnfozxai/sql/new`,
      })
    }

    return NextResponse.json({ setup_required: false })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
