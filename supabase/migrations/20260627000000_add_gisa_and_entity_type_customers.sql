alter table accounting_customers
  add column if not exists gisa_number text,
  add column if not exists entity_type text not null default 'unternehmen';

alter table accounting_customers
  add constraint accounting_customers_entity_type_check
  check (entity_type in ('unternehmen', 'kleinunternehmer', 'einzelunternehmer'));
