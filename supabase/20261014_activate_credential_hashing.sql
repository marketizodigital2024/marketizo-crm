-- Run only after the hash-compatible API deployment has been verified.
begin;
select pg_advisory_xact_lock(hashtext('marketizo-credential-migration'));

create or replace function public.marketizo_hash_credentials_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id='marketizo-main' and (tg_op='INSERT' or new.payload->'employees' is distinct from old.payload->'employees' or new.payload->'clients' is distinct from old.payload->'clients') then
    new.payload=public.marketizo_hash_crm_payload(new.payload);
  end if;
  return new;
end $$;
revoke all on function public.marketizo_hash_credentials_before_write() from public, anon, authenticated;
grant execute on function public.marketizo_hash_credentials_before_write() to service_role;
drop trigger if exists marketizo_hash_credentials_before_write on public.agency_crm_state;
create trigger marketizo_hash_credentials_before_write before insert or update of payload on public.agency_crm_state
for each row execute function public.marketizo_hash_credentials_before_write();

do $$
declare source public.agency_crm_state%rowtype;
begin
  select * into strict source from public.agency_crm_state where id='marketizo-main' for update;
  insert into public.agency_crm_state(id,payload,updated_at)
  values('backup-pre-credential-hash-2026-10-14',jsonb_build_object('backupDate','2026-10-14','sourceUpdatedAt',source.updated_at,'state',source.payload,
    'kpiState',(select payload from public.agency_crm_state where id='marketizo-kpi-v1'),
    'authSnapshot',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.agency_crm_employee_auth a)),clock_timestamp())
  on conflict(id) do nothing;
  if not exists(select 1 from public.agency_crm_state where id='backup-pre-credential-hash-2026-10-14' and payload->'state'=source.payload) then
    raise exception 'Existing pre-hash backup does not match current state; create a fresh named backup before migration';
  end if;
  update public.agency_crm_state set payload=public.marketizo_hash_crm_payload(source.payload),updated_at=clock_timestamp() where id='marketizo-main';
end $$;
commit;
