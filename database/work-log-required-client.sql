-- Prospective validation only; no historical rows are rewritten.
begin;
set local lock_timeout = '5s';
create or replace function marketizo_private.require_new_work_log_client()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare bad_id text;
begin
  if new.id <> 'marketizo-main' then return new; end if;
  if old.payload->'employeeWorkLogs' is not distinct from new.payload->'employeeWorkLogs' then return new; end if;
  -- Validate only new IDs. The existing integrity trigger separately prevents
  -- erasing a saved client/activity on retained historical records.
  with prior as (select w->>'id' id from jsonb_array_elements(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb)) w),
  added as (select w from jsonb_array_elements(new.payload->'employeeWorkLogs') w
    where not exists(select 1 from prior p where p.id=w->>'id'))
  select n.w->>'id' into bad_id from added n
  left join jsonb_array_elements(coalesce(new.payload->'employeeActivities','[]'::jsonb)) a on a->>'id'=n.w->>'activityId'
  left join jsonb_array_elements(coalesce(new.payload->'clients','[]'::jsonb)) c on c->>'id'=n.w->>'clientId'
  where a is null or coalesce(a->>'active','true')='false' or coalesce(btrim(a->>'name'),'')=''
    or n.w->>'activityName' is distinct from a->>'name'
    or n.w->>'activityCategory' is distinct from coalesce(a->>'category','Ostalo')
    or (lower(btrim(coalesce(a->>'category',''))) <> 'interno' and
      (coalesce(btrim(n.w->>'clientId'),'')='' or c is null or coalesce(btrim(c->>'name'),'')=''
       or c->>'status'='Arhiviran' or n.w->>'clientName' is distinct from c->>'name'))
  limit 1;
  if bad_id is not null then
    raise exception 'Novi radni unos zahteva odabranu aktivnost i klijenta: %',bad_id using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function marketizo_private.require_new_work_log_client() from public, anon, authenticated;
grant execute on function marketizo_private.require_new_work_log_client() to service_role;
drop trigger if exists work_log_client_requirement on public.agency_crm_state;
create trigger work_log_client_requirement before update of payload on public.agency_crm_state
for each row execute function marketizo_private.require_new_work_log_client();
commit;
