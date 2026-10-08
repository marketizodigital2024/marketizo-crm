-- Main state and fast employee login records commit together.
create or replace function public.marketizo_sync_employee_auth()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id = 'marketizo-main' then
    insert into public.agency_crm_employee_auth (id,email,password,employee_data,updated_at)
    select employee->>'id', lower(btrim(employee->>'email')), coalesce(employee->>'password',''), employee, new.updated_at
    from jsonb_array_elements(coalesce(new.payload->'employees','[]'::jsonb)) employee
    where coalesce(employee->>'id','') <> '' and coalesce(employee->>'email','') <> ''
    on conflict(id) do update set email=excluded.email,password=excluded.password,employee_data=excluded.employee_data,updated_at=excluded.updated_at;
    delete from public.agency_crm_employee_auth auth
    where not exists (select 1 from jsonb_array_elements(coalesce(new.payload->'employees','[]'::jsonb)) employee where employee->>'id'=auth.id and coalesce(employee->>'email','') <> '');
  end if;
  return new;
end;
$$;
revoke all on function public.marketizo_sync_employee_auth() from public,anon,authenticated;
grant execute on function public.marketizo_sync_employee_auth() to service_role;
create trigger marketizo_sync_employee_auth_after_write
after insert or update of payload on public.agency_crm_state
for each row execute function public.marketizo_sync_employee_auth();

-- Restricted server endpoint: reject concurrent state/KPI changes, restore in one transaction.
create or replace function public.marketizo_restore_backup(p_state jsonb,p_kpi jsonb,p_expected_state_at timestamptz,p_expected_kpi_at timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_state_at timestamptz; current_kpi_at timestamptz; restored_at timestamptz := clock_timestamp();
begin
  if jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state->'employees') <> 'array' or jsonb_array_length(p_state->'employees')=0 then
    raise exception 'Invalid backup state';
  end if;
  select updated_at into current_state_at from public.agency_crm_state where id='marketizo-main' for update;
  if current_state_at is distinct from p_expected_state_at then return jsonb_build_object('ok',false,'conflict',true); end if;
  select updated_at into current_kpi_at from public.agency_crm_state where id='marketizo-kpi-v1' for update;
  if p_kpi is not null and current_kpi_at is distinct from p_expected_kpi_at then return jsonb_build_object('ok',false,'conflict',true); end if;
  if p_kpi is not null then
    insert into public.agency_crm_state(id,payload,updated_at) values('marketizo-kpi-v1',p_kpi,restored_at)
    on conflict(id) do update set payload=excluded.payload,updated_at=excluded.updated_at;
  end if;
  update public.agency_crm_state set payload=p_state,updated_at=restored_at where id='marketizo-main';
  return jsonb_build_object('ok',true,'restoredAt',restored_at,'kpiRestored',p_kpi is not null,'employeeAuthRestored',true);
end;
$$;
revoke all on function public.marketizo_restore_backup(jsonb,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.marketizo_restore_backup(jsonb,jsonb,timestamptz,timestamptz) to service_role;
