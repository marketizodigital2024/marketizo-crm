-- Phase 1: additive-only preparation for the Marketizo CRM v2 data model.
-- Safe to run while the app is live: this creates new tables and never updates,
-- deletes, truncates, or renames agency_crm_state.

begin;

create table if not exists public.crm_v2_employees (
  id text primary key,
  email text not null default '',
  status text not null default '',
  payload jsonb not null,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_v2_clients (
  id text primary key,
  name text not null default '',
  status text not null default '',
  owner text not null default '',
  payload jsonb not null,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_v2_client_files (
  client_id text primary key,
  file_name text not null default '',
  file_data text not null,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_v2_employee_activities (
  id text primary key,
  name text not null default '',
  category text not null default '',
  active boolean not null default true,
  payload jsonb not null,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_v2_employee_work_logs (
  id text primary key,
  employee_id text not null default '',
  client_id text not null default '',
  activity_id text not null default '',
  work_date date,
  minutes integer not null default 0,
  payload jsonb not null,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_v2_employee_absences (
  id text primary key,
  employee_id text not null default '',
  start_date date,
  end_date date,
  status text not null default '',
  payload jsonb not null,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_v2_employee_reports (
  id text primary key,
  employee_id text not null default '',
  recipient_id text not null default '',
  report_date date,
  payload jsonb not null,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists crm_v2_employees_email_idx on public.crm_v2_employees (lower(email));
create index if not exists crm_v2_clients_name_idx on public.crm_v2_clients (lower(name));
create index if not exists crm_v2_work_logs_employee_date_idx on public.crm_v2_employee_work_logs (employee_id, work_date desc);
create index if not exists crm_v2_work_logs_client_date_idx on public.crm_v2_employee_work_logs (client_id, work_date desc);
create index if not exists crm_v2_absences_employee_date_idx on public.crm_v2_employee_absences (employee_id, start_date desc);
create index if not exists crm_v2_reports_employee_date_idx on public.crm_v2_employee_reports (employee_id, report_date desc);

alter table public.crm_v2_employees enable row level security;
alter table public.crm_v2_clients enable row level security;
alter table public.crm_v2_client_files enable row level security;
alter table public.crm_v2_employee_activities enable row level security;
alter table public.crm_v2_employee_work_logs enable row level security;
alter table public.crm_v2_employee_absences enable row level security;
alter table public.crm_v2_employee_reports enable row level security;

revoke all on public.crm_v2_employees, public.crm_v2_clients, public.crm_v2_client_files,
  public.crm_v2_employee_activities, public.crm_v2_employee_work_logs,
  public.crm_v2_employee_absences, public.crm_v2_employee_reports from anon, authenticated;
grant all on public.crm_v2_employees, public.crm_v2_clients, public.crm_v2_client_files,
  public.crm_v2_employee_activities, public.crm_v2_employee_work_logs,
  public.crm_v2_employee_absences, public.crm_v2_employee_reports to service_role;

commit;
