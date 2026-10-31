-- Preserve all saved rows; require descriptions for new or deliberately edited Other entries.
create or replace function marketizo_private.require_other_work_log_note()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare bad_id text;
begin
  if new.id <> 'marketizo-main' then return new; end if;
  if old.payload->'employeeWorkLogs' is not distinct from new.payload->'employeeWorkLogs' then return new; end if;
  select n.w->>'id' into bad_id
  from jsonb_array_elements(coalesce(new.payload->'employeeWorkLogs','[]'::jsonb)) n(w)
  join jsonb_array_elements(coalesce(new.payload->'employeeActivities','[]'::jsonb)) a on a->>'id'=n.w->>'activityId'
  left join jsonb_array_elements(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb)) o on o->>'id'=n.w->>'id'
  where lower(btrim(coalesce(a->>'category','Ostalo'))) in ('ostalo','druge aktivnosti')
    and (o is null or o->>'activityId' is distinct from n.w->>'activityId' or o->>'note' is distinct from n.w->>'note')
    and coalesce(n.w->>'note','') !~ '[^[:space:]]'
  limit 1;
  if bad_id is not null then
    raise exception 'Za Druge aktivnosti obavezan je opis rada: %',bad_id using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function marketizo_private.require_other_work_log_note() from public,anon,authenticated;
grant execute on function marketizo_private.require_other_work_log_note() to service_role;
drop trigger if exists work_log_other_note_requirement on public.agency_crm_state;
create trigger work_log_other_note_requirement before update of payload on public.agency_crm_state
for each row execute function marketizo_private.require_other_work_log_note();
