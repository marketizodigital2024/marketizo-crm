-- Add snapshot/recovery support without rewriting any existing business row.
begin;
set local lock_timeout='5s';
create or replace function public.marketizo_work_production_snapshot()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare source public.agency_crm_state%rowtype; rules jsonb; outputs jsonb;
begin
 select * into source from public.agency_crm_state where id='marketizo-main' for share;
 if not found then raise exception 'Main state missing'; end if;
 lock table public.marketizo_activity_metrics, public.marketizo_work_outputs in share mode;
 select coalesce(jsonb_agg(to_jsonb(m) order by m.activity_id),'[]'::jsonb) into rules from public.marketizo_activity_metrics m;
 select coalesce(jsonb_agg(to_jsonb(o) order by o.log_id),'[]'::jsonb) into outputs from public.marketizo_work_outputs o;
 return jsonb_build_object('payload',source.payload,'updated_at',source.updated_at,'production',jsonb_build_object('format','marketizo-work-production-v1','rules',rules,'outputs',outputs));
end $$;
revoke all on function public.marketizo_work_production_snapshot() from public,anon,authenticated;
grant execute on function public.marketizo_work_production_snapshot() to service_role;

create or replace function public.marketizo_capture_work_production_prewrite()
returns void language plpgsql security invoker set search_path='' as $$
declare snap jsonb; stamp timestamptz:=clock_timestamp(); day_key text; slot_key text;
begin
 snap=public.marketizo_work_production_snapshot();
 day_key=to_char(stamp at time zone 'Europe/Vienna','YYYY-MM-DD');
 slot_key='backup-work-production-'||((extract(epoch from (stamp at time zone 'UTC')::date)::bigint/86400)%30)::text;
 insert into public.agency_crm_state(id,payload,updated_at)
 values(slot_key,jsonb_build_object('backupDate',day_key,'sourceUpdatedAt',snap->>'updated_at','state',snap->'payload','workProduction',snap->'production'),stamp)
 on conflict(id) do update set payload=excluded.payload,updated_at=excluded.updated_at
 where public.agency_crm_state.payload->>'backupDate' is distinct from day_key;
end $$;
revoke all on function public.marketizo_capture_work_production_prewrite() from public,anon,authenticated;
grant execute on function public.marketizo_capture_work_production_prewrite() to service_role;

create or replace function public.marketizo_set_activity_metric(p_actor_id text,p_activity_id text,p_unit text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare source jsonb; actor jsonb; saved public.marketizo_activity_metrics%rowtype;
begin
 select payload into source from public.agency_crm_state where id='marketizo-main' for update;
 select e into actor from jsonb_array_elements(source->'employees') e where e->>'id'=p_actor_id and coalesce(e->>'status','')<>'Neaktivan' and coalesce(e->>'active','true')<>'false';
 if actor is null or p_actor_id not in ('emp-miljan','emp-ivana') then return jsonb_build_object('ok',false,'status',403,'error','Samo vlasnik menja jedinice aktivnosti.'); end if;
 if p_unit is null or p_unit not in ('scenario','scenario_revision','clip','clip_revision','story','post','task','call','shoot','clip_check','voiceover','none') or not exists(select 1 from jsonb_array_elements(source->'employeeActivities') a where a->>'id'=p_activity_id) then
 return jsonb_build_object('ok',false,'status',400,'error','Neispravna aktivnost ili jedinica.'); end if;
 perform public.marketizo_capture_work_production_prewrite();
 insert into public.marketizo_activity_metrics(activity_id,unit,updated_by,updated_at) values(p_activity_id,p_unit,p_actor_id,clock_timestamp())
 on conflict(activity_id) do update set unit=excluded.unit,updated_by=excluded.updated_by,updated_at=excluded.updated_at returning * into saved;
 return jsonb_build_object('ok',true,'rule',to_jsonb(saved));
end $$;
revoke all on function public.marketizo_set_activity_metric(text,text,text) from public,anon,authenticated;
grant execute on function public.marketizo_set_activity_metric(text,text,text) to service_role;

create or replace function public.marketizo_restore_complete_backup_with_production(
 p_state jsonb,p_kpi jsonb,p_expected_state_at timestamptz,p_expected_kpi_at timestamptz,
 p_questionnaires jsonb,p_expected_questionnaires jsonb,p_production jsonb,p_expected_production jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_snap jsonb; restored jsonb;
begin
 perform 1 from public.agency_crm_state where id='marketizo-main' for update;
 lock table public.marketizo_activity_metrics,public.marketizo_work_outputs in share row exclusive mode;
 current_snap=public.marketizo_work_production_snapshot()->'production';
 if current_snap is distinct from p_expected_production then return jsonb_build_object('ok',false,'conflict',true,'productionConflict',true); end if;
 if p_production is null and jsonb_array_length(current_snap->'outputs')>0 then
 return jsonb_build_object('ok',false,'legacyProductionMissing',true); end if;
 if p_production is not null and (p_production->>'format' is distinct from 'marketizo-work-production-v1'
  or jsonb_typeof(p_production->'rules') is distinct from 'array' or jsonb_typeof(p_production->'outputs') is distinct from 'array') then raise exception 'Invalid production snapshot'; end if;
 restored=public.marketizo_restore_complete_backup(p_state,p_kpi,p_expected_state_at,p_expected_kpi_at,p_questionnaires,p_expected_questionnaires);
 if not coalesce((restored->>'ok')::boolean,false) then return restored; end if;
 if p_production is not null then
  delete from public.marketizo_work_outputs;
  delete from public.marketizo_activity_metrics;
  insert into public.marketizo_activity_metrics select * from jsonb_populate_recordset(null::public.marketizo_activity_metrics,p_production->'rules');
  insert into public.marketizo_work_outputs select * from jsonb_populate_recordset(null::public.marketizo_work_outputs,p_production->'outputs');
 end if;
 return restored||jsonb_build_object('workProductionRestored',p_production is not null,'outputRecords',coalesce(jsonb_array_length(p_production->'outputs'),0));
end $$;
revoke all on function public.marketizo_restore_complete_backup_with_production(jsonb,jsonb,timestamptz,timestamptz,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_restore_complete_backup_with_production(jsonb,jsonb,timestamptz,timestamptz,jsonb,jsonb,jsonb,jsonb) to service_role;
grant delete on public.marketizo_activity_metrics,public.marketizo_work_outputs to service_role;
-- Append RPC with prewrite support is installed below in this same transaction.

create or replace function public.marketizo_append_work_log_with_output(
 p_role text,p_actor_id text,p_work_log jsonb,p_backup_date text,p_backup_slot text,p_output jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; prior public.marketizo_work_outputs%rowtype; batch public.marketizo_work_outputs%rowtype;
 unit_key text; qty integer; done boolean; batch_key text; title text; source jsonb; actor jsonb;
begin
 select payload into source from public.agency_crm_state where id='marketizo-main' for update;
 select e into actor from jsonb_array_elements(source->'employees') e where e->>'id'=p_actor_id and coalesce(e->>'active','true')<>'false' and coalesce(e->>'status','')<>'Neaktivan';
 if actor is null or p_role is null or p_role not in ('employee','operational-admin','full-admin')
 or (p_role='employee' and p_work_log->>'employeeId' is distinct from p_actor_id)
 or (p_role='full-admin' and p_actor_id not in ('emp-miljan','emp-ivana'))
 or (p_role='operational-admin' and coalesce(actor->>'isOperationalAdmin','false')<>'true') then
 return jsonb_build_object('ok',false,'status',401,'error','Nalog nema pristup.'); end if;
 if p_output is null or jsonb_typeof(p_output) is distinct from 'object' then
 return jsonb_build_object('ok',false,'status',400,'error','Nedostaju podaci o količini rada.'); end if;
 begin
  qty=(p_output->>'quantity')::integer; done=(p_output->>'completed')::boolean;
  batch_key=p_output->>'batchId'; title=btrim(p_output->>'label');
  if qty is null or done is null or jsonb_typeof(p_output->'completed')<>'boolean'
   or jsonb_typeof(p_output->'quantity')<>'number' or (p_output->>'quantity')::numeric<>qty
   or qty<0 or qty>10000 or (done and qty=0) or (not done and qty<>0)
   or coalesce(batch_key,'') !~ '^[a-zA-Z0-9_-]{1,128}$' or coalesce(length(title),0) not between 1 and 160 then raise exception 'invalid'; end if;
 exception when others then return jsonb_build_object('ok',false,'status',400,'error','Unesi naziv posla i ispravan broj završenih komada; za rad u toku količina je 0.'); end;
 select * into prior from public.marketizo_work_outputs where log_id=p_work_log->>'id';
 if prior.log_id is not null then
  if prior.batch_id is distinct from batch_key or prior.label is distinct from title or prior.unit is distinct from p_output->>'unit'
   or prior.quantity<>qty or prior.completed<>done then return jsonb_build_object('ok',false,'status',409,'error','Sačuvani unos već ima drugačiju količinu. Ne ponavljaj ga kao novi unos.'); end if;
  return public.marketizo_append_work_log(p_role,p_actor_id,p_work_log - 'production',p_backup_date,p_backup_slot);
 end if;
 if exists(select 1 from jsonb_array_elements(coalesce(source->'employeeWorkLogs','[]'::jsonb)) w where w->>'id'=p_work_log->>'id') then
 return jsonb_build_object('ok',false,'status',409,'error','Sati su već sačuvani bez količine. Nemoj dodavati isti rad ponovo.'); end if;
 select * into batch from public.marketizo_work_outputs where batch_id=batch_key limit 1;
 if batch.log_id is not null then
  if batch.employee_id is distinct from p_work_log->>'employeeId' or batch.activity_id is distinct from p_work_log->>'activityId'
   or batch.client_id is distinct from coalesce(p_work_log->>'clientId','') or batch.label is distinct from title
   or exists(select 1 from public.marketizo_work_outputs where batch_id=batch_key and completed) then
   return jsonb_build_object('ok',false,'status',409,'error','Posao je završen ili pripada drugom zaposlenom, klijentu ili aktivnosti. Osveži ponuđene poslove.'); end if;
  if exists(select 1 from public.marketizo_work_outputs o join lateral jsonb_array_elements(source->'employeeWorkLogs') w on w->>'id'=o.log_id where o.batch_id=batch_key and w->>'date'>p_work_log->>'date') then
  return jsonb_build_object('ok',false,'status',400,'error','Datum nastavka ne može biti pre prethodnog rada na ovoj seriji.'); end if;
  unit_key=batch.unit;
 else
  select m.unit into unit_key from public.marketizo_activity_metrics m where m.activity_id=p_work_log->>'activityId';
 end if;
 if unit_key is null or unit_key='none' or unit_key is distinct from p_output->>'unit' then
 return jsonb_build_object('ok',false,'status',409,'error','Jedinica aktivnosti je promenjena. Osveži stranicu pre novog unosa.'); end if;
 perform public.marketizo_capture_work_production_prewrite();
 result=public.marketizo_append_work_log(p_role,p_actor_id,p_work_log - 'production',p_backup_date,p_backup_slot);
 if coalesce((result->>'ok')::boolean,false) then
 insert into public.marketizo_work_outputs(log_id,employee_id,activity_id,client_id,batch_id,label,unit,quantity,completed,recorded_by)
 values(p_work_log->>'id',p_work_log->>'employeeId',p_work_log->>'activityId',coalesce(p_work_log->>'clientId',''),batch_key,title,unit_key,qty,done,p_actor_id);
 end if;
 return result;
end $$;
revoke all on function public.marketizo_append_work_log_with_output(text,text,jsonb,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_append_work_log_with_output(text,text,jsonb,text,text,jsonb) to service_role;
commit;
