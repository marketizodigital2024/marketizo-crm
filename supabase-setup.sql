create table if not exists public.agency_crm_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.agency_crm_state enable row level security;

drop policy if exists "Service role can read crm state" on public.agency_crm_state;
drop policy if exists "Service role can write crm state" on public.agency_crm_state;

create policy "Service role can read crm state"
on public.agency_crm_state
for select
to service_role
using (true);

create policy "Service role can write crm state"
on public.agency_crm_state
for all
to service_role
using (true)
with check (true);
