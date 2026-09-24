-- Acceptance gate. Every legacy_count must equal v2_count before any cutover.
with source as (
  select payload, updated_at from public.agency_crm_state where id='marketizo-main'
)
select 'employees' section, jsonb_array_length(coalesce(payload->'employees','[]')) legacy_count,
  (select count(*) from public.crm_v2_employees) v2_count, updated_at source_updated_at from source
union all select 'clients', jsonb_array_length(coalesce(payload->'clients','[]')),
  (select count(*) from public.crm_v2_clients), updated_at from source
union all select 'employeeActivities', jsonb_array_length(coalesce(payload->'employeeActivities','[]')),
  (select count(*) from public.crm_v2_employee_activities), updated_at from source
union all select 'employeeWorkLogs', jsonb_array_length(coalesce(payload->'employeeWorkLogs','[]')),
  (select count(*) from public.crm_v2_employee_work_logs), updated_at from source
union all select 'employeeAbsences', jsonb_array_length(coalesce(payload->'employeeAbsences','[]')),
  (select count(*) from public.crm_v2_employee_absences), updated_at from source
union all select 'employeeReports', jsonb_array_length(coalesce(payload->'employeeReports','[]')),
  (select count(*) from public.crm_v2_employee_reports), updated_at from source;

-- IDs present in one side only. Every result must be zero.
with source as (select payload from public.agency_crm_state where id='marketizo-main'),
legacy as (select item->>'id' id from source cross join lateral jsonb_array_elements(coalesce(payload->'employeeWorkLogs','[]')) item),
v2 as (select id from public.crm_v2_employee_work_logs)
select
  (select count(*) from legacy left join v2 using(id) where v2.id is null) missing_in_v2,
  (select count(*) from v2 left join legacy using(id) where legacy.id is null) extra_in_v2;

-- Referential diagnostics only; these do not delete or rewrite historical logs.
select
  count(*) filter (where e.id is null) missing_employee_refs,
  count(*) filter (where nullif(w.client_id,'') is not null and c.id is null) missing_client_refs,
  count(*) filter (where nullif(w.activity_id,'') is not null and a.id is null) missing_activity_refs
from public.crm_v2_employee_work_logs w
left join public.crm_v2_employees e on e.id=w.employee_id
left join public.crm_v2_clients c on c.id=w.client_id
left join public.crm_v2_employee_activities a on a.id=w.activity_id;
