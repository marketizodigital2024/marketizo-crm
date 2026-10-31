-- Additive storage: old CRM serializers cannot erase production counts.
begin;
set local lock_timeout = '5s';
create table if not exists public.marketizo_activity_metrics (
  activity_id text primary key, unit text not null check (unit in ('scenario','scenario_revision','clip','clip_revision','story','post','task','call','shoot','clip_check','none')),
  updated_at timestamptz not null default now(), updated_by text not null
);
create table if not exists public.marketizo_work_outputs (
  log_id text primary key, employee_id text not null, activity_id text not null, client_id text not null,
  batch_id text not null, label text not null check(length(label) between 1 and 160), unit text not null,
  quantity integer not null check(quantity between 0 and 10000), completed boolean not null,
  recorded_at timestamptz not null default now(), recorded_by text not null,
  check ((completed and quantity>0) or (not completed and quantity=0))
);
create index if not exists work_outputs_batch on public.marketizo_work_outputs(batch_id);
create index if not exists work_outputs_employee on public.marketizo_work_outputs(employee_id);
create unique index if not exists work_outputs_one_completion on public.marketizo_work_outputs(batch_id) where completed;
alter table public.marketizo_activity_metrics enable row level security;
alter table public.marketizo_work_outputs enable row level security;
revoke all on public.marketizo_activity_metrics, public.marketizo_work_outputs from public, anon, authenticated;
grant select,insert,update on public.marketizo_activity_metrics to service_role;
grant select,insert on public.marketizo_work_outputs to service_role;
insert into public.marketizo_activity_metrics(activity_id,unit,updated_by)
select a->>'id',case lower(btrim(a->>'name'))
  when 'pisanje scenarija' then 'scenario' when 'ispravke scenarija' then 'scenario_revision'
  when 'edit klipova' then 'clip' when 'ispravka klipova' then 'clip_revision'
  when 'dizajn storija' then 'story' when 'dizajn postova' then 'post' end,'initial-configuration'
from public.agency_crm_state s cross join lateral jsonb_array_elements(s.payload->'employeeActivities') a
where s.id='marketizo-main' and lower(btrim(a->>'name')) in
 ('pisanje scenarija','ispravke scenarija','edit klipova','ispravka klipova','dizajn storija','dizajn postova')
on conflict(activity_id) do nothing;

-- The existing append, hours, backup and output record commit in one transaction.
-- Only the server service role can call this wrapper; employee identity is checked again by the original RPC.
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
