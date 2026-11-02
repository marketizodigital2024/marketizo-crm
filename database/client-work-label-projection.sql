-- Extend only the employee's safe client projection; no business data writes.
begin;
set local lock_timeout='2s';
CREATE OR REPLACE FUNCTION public.marketizo_read_session_state(p_role text, p_employee_id text DEFAULT NULL::text, p_client_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare source public.agency_crm_state%rowtype; actor jsonb; result jsonb; visible_ids text[];
begin
  select * into source from public.agency_crm_state where id='marketizo-main';
  if source.id is null then return null; end if;
  if p_role='client' then
    select c into actor from jsonb_array_elements(coalesce(source.payload->'clients','[]'::jsonb)) c where c->>'id'=p_client_id and coalesce(c->>'status','')<>'Arhiviran';
    if actor is null then return null; end if;
    result=jsonb_build_object('clients',jsonb_build_array(actor),
      'leads',coalesce((select jsonb_agg(l) from jsonb_array_elements(coalesce(source.payload->'leads','[]'::jsonb)) l where l->>'clientId'=p_client_id or l->>'client'=actor->>'name'),'[]'::jsonb),
      'teamMembers',coalesce((select jsonb_agg(t) from jsonb_array_elements(coalesce(source.payload->'teamMembers','[]'::jsonb)) t where t->>'clientId'=p_client_id or t->>'client'=actor->>'name'),'[]'::jsonb));
  else
    select e into actor from jsonb_array_elements(coalesce(source.payload->'employees','[]'::jsonb)) e where e->>'id'=p_employee_id and coalesce(e->>'status','')<>'Neaktivan' and coalesce(e->>'active','true')<>'false';
    if actor is null then return null; end if;
    if p_role='full-admin' and p_employee_id in ('emp-miljan','emp-ivana') then result=source.payload;
    elsif p_role='operational-admin' and actor->>'isOperationalAdmin'='true' then result=source.payload;
    elsif p_role='employee' then
      select array_agg(e->>'id') into visible_ids from jsonb_array_elements(source.payload->'employees') e
        where e->>'id'=p_employee_id or (actor->>'isLeader'='true' and (p_employee_id in ('emp-miljan','emp-ivana') or e->>'leaderId'=p_employee_id));
      result=jsonb_set(source.payload,'{clients}',coalesce((select jsonb_agg(jsonb_build_object('id',c->>'id','name',c->>'name','status',c->>'status','clickupName',c->>'clickupName')) from jsonb_array_elements(coalesce(source.payload->'clients','[]'::jsonb)) c),'[]'::jsonb));
      result=jsonb_set(result,'{employeeWorkLogs}',coalesce((select jsonb_agg(l) from jsonb_array_elements(coalesce(source.payload->'employeeWorkLogs','[]'::jsonb)) l where l->>'employeeId'=any(visible_ids)),'[]'::jsonb));
    else return null; end if;
  end if;
  return jsonb_build_object('payload',result,'updated_at',source.updated_at);
end $function$;

revoke all on function public.marketizo_read_session_state(text,text,text) from public,anon,authenticated;
grant execute on function public.marketizo_read_session_state(text,text,text) to service_role;
commit;

