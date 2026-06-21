alter table accounting_partners drop constraint if exists accounting_partners_entity_type_check;
alter table accounting_sales_partners drop constraint if exists accounting_sales_partners_entity_type_check;

update accounting_partners set entity_type = 'einzelunternehmer' where entity_type = 'freelancer';
update accounting_sales_partners set entity_type = 'einzelunternehmer' where entity_type = 'freelancer';

alter table accounting_partners
  add constraint accounting_partners_entity_type_check
  check (entity_type in ('unternehmen', 'kleinunternehmer', 'einzelunternehmer'));

alter table accounting_sales_partners
  add constraint accounting_sales_partners_entity_type_check
  check (entity_type in ('unternehmen', 'kleinunternehmer', 'einzelunternehmer'));
