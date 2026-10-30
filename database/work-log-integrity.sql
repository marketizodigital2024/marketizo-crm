-- STAGED ONLY: deploy after review, backup and off-hours verification.
-- No existing CRM records are rewritten by this script.
begin;
create schema if not exists marketizo_private;
revoke all on schema marketizo_private from public, anon, authenticated;
grant usage on schema marketizo_private to service_role;
create table if not exists marketizo_private.work_log_audit (
  audit_id bigint generated always as identity primary key,
  recorded_at timestamptz not null default clock_timestamp(),
  transaction_id bigint not null default txid_current(),
  log_id text not null,
  action text not null check(action in ('insert','update','delete')),
  actor_id text,
  write_source text not null,
  before_record jsonb,
  after_record jsonb
);
alter table marketizo_private.work_log_audit enable row level security;
revoke all on marketizo_private.work_log_audit from public, anon, authenticated;
grant select, insert on marketizo_private.work_log_audit to service_role;
grant usage, select on sequence marketizo_private.work_log_audit_audit_id_seq to service_role;

create or replace function marketizo_private.guard_and_audit_work_logs()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare bad_id text; headers jsonb; actor text; origin text;
begin
  if new.id <> 'marketizo-main' then return new; end if;
  if old.payload->'employeeWorkLogs' is not distinct from new.payload->'employeeWorkLogs' then return new; end if;
  if jsonb_typeof(new.payload->'employeeWorkLogs') is distinct from 'array' then
    raise exception 'Work log collection must remain an array' using errcode='23514';
  end if;
  if exists (select 1 from jsonb_array_elements(new.payload->'employeeWorkLogs') w
    group by w->>'id' having count(*)>1 or coalesce(w->>'id','')='') then
    raise exception 'Duplicate or missing work log ID' using errcode='23514';
  end if;
  with prior as (select w from jsonb_array_elements(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb)) w),
  desired as (select w from jsonb_array_elements(new.payload->'employeeWorkLogs') w),
  pairs as (select p.w as p, n.w as n,
    exists(select 1 from jsonb_array_elements(coalesce(new.payload->'employeeActivities','[]'::jsonb)) a
      where a->>'id'=n.w->>'activityId' and lower(btrim(a->>'category'))='interno'
      and n.w->>'activityName'=a->>'name' and n.w->>'activityCategory'=a->>'category') as internal
    from prior p join desired n on p.w->>'id'=n.w->>'id')
  select p->>'id' into bad_id from pairs cross join unnest(array['activityId','activityName','activityCategory','clientId','clientName']) f
  where coalesce(btrim(p->>f),'')<>'' and coalesce(btrim(n->>f),'')=''
    and not (internal and f in ('clientId','clientName')) limit 1;
  if bad_id is not null then
    raise exception 'Work log metadata loss blocked: %',bad_id using errcode='23514';
  end if;
  -- Detect the non-empty fallback values produced by older serializers as well.
  with prior as (select w from jsonb_array_elements(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb)) w),
  desired as (select w from jsonb_array_elements(new.payload->'employeeWorkLogs') w)
  select p.w->>'id' into bad_id from prior p join desired n on p.w->>'id'=n.w->>'id'
  left join jsonb_array_elements(coalesce(new.payload->'employeeActivities','[]'::jsonb)) a on a->>'id'=n.w->>'activityId'
  where coalesce(p.w->>'activityId','')<>''
    and ((p.w->>'activityId' is distinct from n.w->>'activityId' and a is null)
      or (a is not null and (
        ((p.w->>'activityId' is distinct from n.w->>'activityId' or p.w->>'activityName' is distinct from n.w->>'activityName') and n.w->>'activityName' is distinct from a->>'name')
        or ((p.w->>'activityId' is distinct from n.w->>'activityId' or p.w->>'activityCategory' is distinct from n.w->>'activityCategory') and n.w->>'activityCategory' is distinct from a->>'category')))) limit 1;
  if bad_id is not null then
    raise exception 'Work log fallback metadata blocked: %',bad_id using errcode='23514';
  end if;
  headers=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  actor=nullif(headers->>'x-marketizo-actor-id','');
  origin=coalesce(nullif(headers->>'x-marketizo-write-source',''),'database-or-rpc');
  with prior as (select w from jsonb_array_elements(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb)) w),
  desired as (select w from jsonb_array_elements(new.payload->'employeeWorkLogs') w)
  insert into marketizo_private.work_log_audit(log_id,action,actor_id,write_source,before_record,after_record)
  select coalesce(p.w->>'id',n.w->>'id'),
    case when p.w is null then 'insert' when n.w is null then 'delete' else 'update' end,
    actor,origin,p.w,n.w from prior p full join desired n on p.w->>'id'=n.w->>'id'
    where p.w is distinct from n.w;
  return new;
end $$;
revoke all on function marketizo_private.guard_and_audit_work_logs() from public, anon, authenticated;
grant execute on function marketizo_private.guard_and_audit_work_logs() to service_role;
drop trigger if exists work_log_integrity_guard on public.agency_crm_state;
create trigger work_log_integrity_guard before update of payload on public.agency_crm_state
for each row execute function marketizo_private.guard_and_audit_work_logs();
commit;
