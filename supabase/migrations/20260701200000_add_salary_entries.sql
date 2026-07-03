create table if not exists accounting_salary_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  reference_number text,
  employer_name    text not null,
  gross_amount     numeric(12,2) not null,
  tax_withheld     numeric(12,2) not null default 0,
  period_year      int not null,
  entry_type       text not null default 'employment', -- 'employment' | 'gf_salary'
  notes            text,
  file_path        text,
  created_at       timestamptz not null default now()
);

alter table accounting_salary_entries enable row level security;
