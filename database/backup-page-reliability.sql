-- Read-only page budget; no business rows or restore guards are changed.
begin;
set local lock_timeout='2s';
alter function public.marketizo_system_domains_keyed_page(text,jsonb) set statement_timeout='15s';
commit;
