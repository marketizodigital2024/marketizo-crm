-- Phase 2: idempotent copy from the legacy JSON state into the v2 tables.
-- This is additive-only. The legacy row remains the production source of truth.

begin;

with source as (
  select payload, updated_at from public.agency_crm_state where id = 'marketizo-main'
), items as (
  select item, source.updated_at from source cross join lateral jsonb_array_elements(coalesce(payload->'employees', '[]'::jsonb)) item
)
insert into public.crm_v2_employees (id, email, status, payload, source_updated_at, updated_at)
select item->>'id', lower(trim(coalesce(item->>'email', ''))), coalesce(item->>'status', ''), item - 'password', updated_at, now()
from items where nullif(item->>'id', '') is not null
on conflict (id) do update set email=excluded.email, status=excluded.status, payload=excluded.payload,
  source_updated_at=excluded.source_updated_at, updated_at=excluded.updated_at;

with source as (
  select payload, updated_at from public.agency_crm_state where id = 'marketizo-main'
), items as (
  select item, source.updated_at from source cross join lateral jsonb_array_elements(coalesce(payload->'clients', '[]'::jsonb)) item
)
insert into public.crm_v2_clients (id, name, status, owner, payload, source_updated_at, updated_at)
select item->>'id', coalesce(item->>'name', ''), coalesce(item->>'status', ''), coalesce(item->>'owner', ''),
  item - 'contractFileData' - 'contractFileName' - 'loginPassword', updated_at, now()
from items where nullif(item->>'id', '') is not null
on conflict (id) do update set name=excluded.name, status=excluded.status, owner=excluded.owner,
  payload=excluded.payload, source_updated_at=excluded.source_updated_at, updated_at=excluded.updated_at;

with source as (
  select payload, updated_at from public.agency_crm_state where id = 'marketizo-main'
), items as (
  select item, source.updated_at from source cross join lateral jsonb_array_elements(coalesce(payload->'clients', '[]'::jsonb)) item
)
insert into public.crm_v2_client_files (client_id, file_name, file_data, source_updated_at, updated_at)
select item->>'id', coalesce(item->>'contractFileName', ''), item->>'contractFileData', updated_at, now()
from items where nullif(item->>'id', '') is not null and nullif(item->>'contractFileData', '') is not null
on conflict (client_id) do update set file_name=excluded.file_name, file_data=excluded.file_data,
  source_updated_at=excluded.source_updated_at, updated_at=excluded.updated_at;

with source as (select payload, updated_at from public.agency_crm_state where id='marketizo-main'),
items as (select item, source.updated_at from source cross join lateral jsonb_array_elements(coalesce(payload->'employeeActivities','[]'::jsonb)) item)
insert into public.crm_v2_employee_activities (id,name,category,active,payload,source_updated_at,updated_at)
select item->>'id',coalesce(item->>'name',''),coalesce(item->>'category',''),coalesce((item->>'active')::boolean,true),item,updated_at,now()
from items where nullif(item->>'id','') is not null
on conflict(id) do update set name=excluded.name,category=excluded.category,active=excluded.active,payload=excluded.payload,source_updated_at=excluded.source_updated_at,updated_at=excluded.updated_at;

with source as (select payload, updated_at from public.agency_crm_state where id='marketizo-main'),
items as (select item, source.updated_at from source cross join lateral jsonb_array_elements(coalesce(payload->'employeeWorkLogs','[]'::jsonb)) item)
insert into public.crm_v2_employee_work_logs (id,employee_id,client_id,activity_id,work_date,minutes,payload,source_updated_at,updated_at)
select item->>'id',coalesce(item->>'employeeId',''),coalesce(item->>'clientId',''),coalesce(item->>'activityId',''),
  nullif(item->>'date','')::date,coalesce(nullif(item->>'minutes','')::integer,0),item,updated_at,now()
from items where nullif(item->>'id','') is not null
on conflict(id) do update set employee_id=excluded.employee_id,client_id=excluded.client_id,activity_id=excluded.activity_id,
  work_date=excluded.work_date,minutes=excluded.minutes,payload=excluded.payload,source_updated_at=excluded.source_updated_at,updated_at=excluded.updated_at;

with source as (select payload, updated_at from public.agency_crm_state where id='marketizo-main'),
items as (select item, source.updated_at from source cross join lateral jsonb_array_elements(coalesce(payload->'employeeAbsences','[]'::jsonb)) item)
insert into public.crm_v2_employee_absences (id,employee_id,start_date,end_date,status,payload,source_updated_at,updated_at)
select item->>'id',coalesce(item->>'employeeId',''),nullif(item->>'startDate','')::date,nullif(item->>'endDate','')::date,
  coalesce(item->>'status',''),item,updated_at,now()
from items where nullif(item->>'id','') is not null
on conflict(id) do update set employee_id=excluded.employee_id,start_date=excluded.start_date,end_date=excluded.end_date,
  status=excluded.status,payload=excluded.payload,source_updated_at=excluded.source_updated_at,updated_at=excluded.updated_at;

with source as (select payload, updated_at from public.agency_crm_state where id='marketizo-main'),
items as (select item, source.updated_at from source cross join lateral jsonb_array_elements(coalesce(payload->'employeeReports','[]'::jsonb)) item)
insert into public.crm_v2_employee_reports (id,employee_id,recipient_id,report_date,payload,source_updated_at,updated_at)
select item->>'id',coalesce(item->>'employeeId',''),coalesce(item->>'recipientId',''),nullif(item->>'date','')::date,item,updated_at,now()
from items where nullif(item->>'id','') is not null
on conflict(id) do update set employee_id=excluded.employee_id,recipient_id=excluded.recipient_id,report_date=excluded.report_date,
  payload=excluded.payload,source_updated_at=excluded.source_updated_at,updated_at=excluded.updated_at;

commit;
