-- Keep validation, atomic append, audit history and daily recovery intact.
-- Only CREATE OR REPLACE FUNCTION: no table rewrite or trigger disable.
begin;
set local lock_timeout='2s';
CREATE OR REPLACE FUNCTION marketizo_private.guard_and_audit_work_logs()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  -- A structural equality proof permits auditing only the prepended record.
  -- The full duplicate-ID check above still applies to the complete collection.
  if jsonb_typeof(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb))='array' and jsonb_array_length(new.payload->'employeeWorkLogs')=jsonb_array_length(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb))+1 and ((new.payload->'employeeWorkLogs')-0)=coalesce(old.payload->'employeeWorkLogs','[]'::jsonb) then
    headers=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
    actor=nullif(headers->>'x-marketizo-actor-id','');
    origin=coalesce(nullif(headers->>'x-marketizo-write-source',''),'database-or-rpc');
    insert into marketizo_private.work_log_audit(log_id,action,actor_id,write_source,before_record,after_record)
    values(new.payload->'employeeWorkLogs'->0->>'id','insert',actor,origin,null,new.payload->'employeeWorkLogs'->0);
    return new;
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
end $function$
;

CREATE OR REPLACE FUNCTION marketizo_private.require_new_work_log_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare bad_id text; fast_append boolean;
begin
  if new.id <> 'marketizo-main' then return new; end if;
  if old.payload->'employeeWorkLogs' is not distinct from new.payload->'employeeWorkLogs' then return new; end if;
  fast_append=(jsonb_typeof(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb))='array' and jsonb_array_length(new.payload->'employeeWorkLogs')=jsonb_array_length(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb))+1 and ((new.payload->'employeeWorkLogs')-0)=coalesce(old.payload->'employeeWorkLogs','[]'::jsonb));
  -- Validate only new IDs. The existing integrity trigger separately prevents
  -- erasing a saved client/activity on retained historical records.
  with prior as (select w->>'id' id from jsonb_array_elements(case when fast_append then '[]'::jsonb else coalesce(old.payload->'employeeWorkLogs','[]'::jsonb) end) w),
  added as (select w from jsonb_array_elements(case when fast_append then jsonb_build_array(new.payload->'employeeWorkLogs'->0) else new.payload->'employeeWorkLogs' end) w
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
end $function$
;

CREATE OR REPLACE FUNCTION marketizo_private.require_other_work_log_note()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare bad_id text; fast_append boolean;
begin
  if new.id <> 'marketizo-main' then return new; end if;
  if old.payload->'employeeWorkLogs' is not distinct from new.payload->'employeeWorkLogs' then return new; end if;
  fast_append=(jsonb_typeof(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb))='array' and jsonb_array_length(new.payload->'employeeWorkLogs')=jsonb_array_length(coalesce(old.payload->'employeeWorkLogs','[]'::jsonb))+1 and ((new.payload->'employeeWorkLogs')-0)=coalesce(old.payload->'employeeWorkLogs','[]'::jsonb));
  select n.w->>'id' into bad_id
  from jsonb_array_elements(case when fast_append then jsonb_build_array(new.payload->'employeeWorkLogs'->0) else coalesce(new.payload->'employeeWorkLogs','[]'::jsonb) end) n(w)
  join jsonb_array_elements(coalesce(new.payload->'employeeActivities','[]'::jsonb)) a on a->>'id'=n.w->>'activityId'
  left join jsonb_array_elements(case when fast_append then '[]'::jsonb else coalesce(old.payload->'employeeWorkLogs','[]'::jsonb) end) o on o->>'id'=n.w->>'id'
  where lower(btrim(coalesce(a->>'category','Ostalo'))) in ('ostalo','druge aktivnosti')
    and (o is null or o->>'activityId' is distinct from n.w->>'activityId' or o->>'note' is distinct from n.w->>'note')
    and coalesce(n.w->>'note','') !~ '[^[:space:]]'
  limit 1;
  if bad_id is not null then
    raise exception 'Za Druge aktivnosti obavezan je opis rada: %',bad_id using errcode='23514';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.marketizo_append_work_log(p_role text, p_actor_id text, p_work_log jsonb, p_backup_date text, p_backup_slot text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  source public.agency_crm_state%rowtype;
  actor jsonb; employee jsonb; activity jsonb; client jsonb; existing jsonb; canonical jsonb;
  log_date date; minutes integer; internal boolean; stamp timestamptz;
begin
  if p_role is null or p_role not in ('employee','operational-admin','full-admin') or p_actor_id is null then
    return jsonb_build_object('ok',false,'status',401,'error','Prijava je obavezna.');
  end if;
  if jsonb_typeof(p_work_log) is distinct from 'object' or coalesce(p_work_log->>'id','')='' or length(p_work_log->>'id')>128 then
    return jsonb_build_object('ok',false,'status',400,'error','Neispravan identitet aktivnosti.');
  end if;
  begin
    log_date=(p_work_log->>'date')::date;
    minutes=(p_work_log->>'minutes')::integer;
    if to_char(log_date,'YYYY-MM-DD') is distinct from p_work_log->>'date' or minutes<1 or minutes>1440 or (p_work_log->>'minutes')::numeric<>minutes then raise exception 'invalid'; end if;
  exception when others then return jsonb_build_object('ok',false,'status',400,'error','Neispravan datum ili broj minuta.'); end;
  if log_date is null or minutes is null then return jsonb_build_object('ok',false,'status',400,'error','Nedostaje datum ili broj minuta.'); end if;
  if p_backup_date is null or p_backup_slot is null or p_backup_date !~ '^\d{4}-\d{2}-\d{2}$' or p_backup_slot !~ '^backup-prewrite-([0-9]|[12][0-9])$' then
    return jsonb_build_object('ok',false,'status',400,'error','Neispravna backup oznaka.');
  end if;
  select * into source from public.agency_crm_state where id='marketizo-main' for update;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','Glavni zapis baze nije pronađen.'); end if;
  select e into actor from jsonb_array_elements(source.payload->'employees') e where e->>'id'=p_actor_id and coalesce(e->>'active','true')<>'false' and coalesce(e->>'status','')<>'Neaktivan';
  if actor is null or (p_role='full-admin' and p_actor_id not in ('emp-miljan','emp-ivana')) or (p_role='operational-admin' and coalesce(actor->>'isOperationalAdmin','false')<>'true') or (p_role='employee' and p_work_log->>'employeeId' is distinct from p_actor_id) then
    return jsonb_build_object('ok',false,'status',401,'error','Nalog nije aktivan ili nema pristup.');
  end if;
  select w into existing from jsonb_array_elements(coalesce(source.payload->'employeeWorkLogs','[]'::jsonb)) w where w->>'id'=p_work_log->>'id' limit 1;
  if existing is not null then
    if existing->>'employeeId' is distinct from p_work_log->>'employeeId' or existing->>'date' is distinct from p_work_log->>'date' or existing->>'minutes' is distinct from minutes::text or existing->>'activityId' is distinct from p_work_log->>'activityId' or coalesce(existing->>'clientId','') is distinct from (case when lower(coalesce(existing->>'activityCategory',''))='interno' then '' else coalesce(p_work_log->>'clientId','') end) or coalesce(existing->>'note','') is distinct from coalesce(p_work_log->>'note','') then
      return jsonb_build_object('ok',false,'status',409,'error','Isti identitet već pripada drugačijem unosu.');
    end if;
    return jsonb_build_object('ok',true,'status',200,'duplicate',true,'workLogId',existing->>'id','updatedAt',source.updated_at);
  end if;
  select e into employee from jsonb_array_elements(source.payload->'employees') e where e->>'id'=p_work_log->>'employeeId' and coalesce(e->>'status','')<>'Neaktivan' and coalesce(e->>'active','true')<>'false';
  if employee is null then return jsonb_build_object('ok',false,'status',400,'error','Zaposleni nije pronađen ili nalog nije aktivan.'); end if;
  -- Apply bounds only to new employee submissions; a committed retry above remains valid.
  if p_role='employee' then
    if log_date > (clock_timestamp() at time zone 'Europe/Vienna')::date then
      return jsonb_build_object('ok',false,'status',400,'error','Ne možeš upisati odrađeno vreme za budući datum.');
    end if;
    if (coalesce(employee->>'startDate','') ~ '^\d{4}-\d{2}-\d{2}$' and p_work_log->>'date' < employee->>'startDate') or
       (coalesce(employee->>'endDate','') ~ '^\d{4}-\d{2}-\d{2}$' and p_work_log->>'date' > employee->>'endDate') then
      return jsonb_build_object('ok',false,'status',400,'error','Datum rada je van upisanog perioda zaposlenja. Obrati se administratoru za istorijsku korekciju.');
    end if;
    if minutes + coalesce((select sum(case when coalesce(w->>'minutes','') ~ '^\d+(\.\d+)?$' then (w->>'minutes')::numeric else 0 end)
       from jsonb_array_elements(coalesce(source.payload->'employeeWorkLogs','[]'::jsonb)) w
       where w->>'employeeId'=p_actor_id and w->>'date'=p_work_log->>'date'),0) > 1440 then
      return jsonb_build_object('ok',false,'status',400,'error','Ukupno upisano vreme za jedan dan ne može preći 24 sata. Proveri postojeće unose.');
    end if;
  end if;
  select a into activity from jsonb_array_elements(source.payload->'employeeActivities') a where a->>'id'=p_work_log->>'activityId' and coalesce(a->>'active','true')<>'false';
  if activity is null then return jsonb_build_object('ok',false,'status',400,'error','Aktivnost više nije dostupna.'); end if;
  if lower(btrim(coalesce(activity->>'category','Ostalo'))) in ('ostalo','druge aktivnosti') and coalesce(p_work_log->>'note','') !~ '[^[:space:]]' then
    return jsonb_build_object('ok',false,'status',400,'error','Za Druge aktivnosti obavezno ukratko opiši šta si radio/la.');
  end if;
  internal=lower(btrim(coalesce(activity->>'category','')))='interno';
  if not internal then
    select c into client from jsonb_array_elements(source.payload->'clients') c where c->>'id'=p_work_log->>'clientId';
    if client is null then return jsonb_build_object('ok',false,'status',400,'error','Izabrani klijent nije pronađen.'); end if;
  end if;
  canonical=p_work_log||jsonb_build_object('employeeId',employee->>'id','minutes',minutes,'hours',round(minutes::numeric/60,4),'activityId',activity->>'id','activityName',activity->>'name','activityCategory',coalesce(activity->>'category','Ostalo'),'clientId',case when internal then '' else client->>'id' end,'clientName',case when internal then '' else client->>'name' end,'locked',true,'type','Rad');
  if not exists(select 1 from public.agency_crm_state where id=p_backup_slot and payload->>'backupDate'=p_backup_date) then
  insert into public.agency_crm_state(id,payload,updated_at)
    values(p_backup_slot,jsonb_build_object('backupDate',p_backup_date,'sourceUpdatedAt',source.updated_at,'state',source.payload),clock_timestamp())
    on conflict(id) do update set payload=excluded.payload,updated_at=excluded.updated_at where public.agency_crm_state.payload->>'backupDate' is distinct from p_backup_date;
  end if;
  stamp=clock_timestamp();
  canonical=canonical||jsonb_build_object('recordedBy',p_actor_id,'serverSavedAt',stamp);
  update public.agency_crm_state set payload=jsonb_set(source.payload,'{employeeWorkLogs}',jsonb_build_array(canonical)||coalesce(source.payload->'employeeWorkLogs','[]'::jsonb)),updated_at=stamp where id='marketizo-main';
  return jsonb_build_object('ok',true,'status',200,'workLogId',canonical->>'id','updatedAt',stamp);
end $function$
;

CREATE OR REPLACE FUNCTION public.marketizo_capture_work_production_prewrite()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare snap jsonb; stamp timestamptz:=clock_timestamp(); day_key text; slot_key text;
begin
 day_key=to_char(stamp at time zone 'Europe/Vienna','YYYY-MM-DD');
 slot_key='backup-work-production-'||((extract(epoch from (stamp at time zone 'UTC')::date)::bigint/86400)%30)::text;
 -- A complete daily snapshot already exists; do not rebuild it per entry.
 if exists(select 1 from public.agency_crm_state where id=slot_key and payload->>'backupDate'=day_key) then return; end if;
 snap=public.marketizo_work_production_snapshot();
 insert into public.agency_crm_state(id,payload,updated_at)
 values(slot_key,jsonb_build_object('backupDate',day_key,'sourceUpdatedAt',snap->>'updated_at','state',snap->'payload','workProduction',snap->'production'),stamp)
 on conflict(id) do update set payload=excluded.payload,updated_at=excluded.updated_at
 where public.agency_crm_state.payload->>'backupDate' is distinct from day_key;
end $function$
;
commit;
