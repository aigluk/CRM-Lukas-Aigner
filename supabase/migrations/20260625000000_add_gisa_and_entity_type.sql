alter table accounting_partners
  add column if not exists gisa_number text,
  add column if not exists entity_type text not null default 'unternehmen';

alter table accounting_sales_partners
  add column if not exists gisa_number text,
  add column if not exists entity_type text not null default 'unternehmen';

alter table accounting_partners
  add constraint accounting_partners_entity_type_check
  check (entity_type in ('unternehmen', 'kleinunternehmer', 'freelancer'));

alter table accounting_sales_partners
  add constraint accounting_sales_partners_entity_type_check
  check (entity_type in ('unternehmen', 'kleinunternehmer', 'freelancer'));
