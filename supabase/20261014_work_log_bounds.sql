-- Small authenticated work-log writes; row lock, backup and append commit together.
create or replace function public.marketizo_append_work_log(
  p_role text, p_actor_id text, p_work_log jsonb, p_backup_date text, p_backup_slot text
) returns jsonb language plpgsql security definer set search_path='' as $$
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
  insert into public.agency_crm_state(id,payload,updated_at)
    values(p_backup_slot,jsonb_build_object('backupDate',p_backup_date,'sourceUpdatedAt',source.updated_at,'state',source.payload),clock_timestamp())
    on conflict(id) do update set payload=excluded.payload,updated_at=excluded.updated_at where public.agency_crm_state.payload->>'backupDate' is distinct from p_backup_date;
  stamp=clock_timestamp();
  canonical=canonical||jsonb_build_object('recordedBy',p_actor_id,'serverSavedAt',stamp);
  update public.agency_crm_state set payload=jsonb_set(source.payload,'{employeeWorkLogs}',jsonb_build_array(canonical)||coalesce(source.payload->'employeeWorkLogs','[]'::jsonb)),updated_at=stamp where id='marketizo-main';
  return jsonb_build_object('ok',true,'status',200,'workLogId',canonical->>'id','updatedAt',stamp);
end $$;
revoke all on function public.marketizo_append_work_log(text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.marketizo_append_work_log(text,text,jsonb,text,text) to service_role;
