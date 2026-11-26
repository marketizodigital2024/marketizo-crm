-- Isolated KPI storage. Installation changes no employee, authentication or work row.
begin;
set local lock_timeout='2s';
create or replace function public.marketizo_employee_kpi_scope(p_actor text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare staff jsonb; actor jsonb; ids jsonb; owner boolean;
begin
 select payload->'employees' into staff from public.agency_crm_state where id='marketizo-main';
 select e into actor from jsonb_array_elements(coalesce(staff,'[]')) e where e->>'id'=p_actor and coalesce(e->>'status','')<>'Neaktivan' and coalesce(e->>'active','true')<>'false';
 if actor is null then return null; end if;
 owner=p_actor in ('emp-miljan','emp-ivana');
 if not owner and actor->>'isLeader' is distinct from 'true' then return null; end if;
 select coalesce(jsonb_agg(e->>'id'),'[]') into ids from jsonb_array_elements(staff) e
 where owner or (e->>'leaderId'=p_actor and e->>'id'<>p_actor and e->>'id' not in ('emp-miljan','emp-ivana') and coalesce(e->>'isLeader','false')<>'true');
 return jsonb_build_object('owner',owner,'ids',ids,'actorName',actor->>'name');
end $$;
create or replace function public.marketizo_employee_kpi_read(p_actor text)
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='5s' as $$
declare access jsonb; doc jsonb; stamp timestamptz; records jsonb; staff jsonb; clients jsonb; activities jsonb;
begin
 access=public.marketizo_employee_kpi_scope(p_actor);
 if access is null then return jsonb_build_object('ok',false,'status',403);end if;
 select payload,updated_at into doc,stamp from public.agency_crm_state where id='marketizo-employee-kpi-v1';
 select coalesce(jsonb_agg(e-'intent' order by e->>'date' desc,e->>'createdAt' desc),'[]') into records
 from jsonb_array_elements(coalesce(doc->'entries','[]')) e where access->'ids' ? (e->>'employeeId');
 select coalesce(jsonb_agg(jsonb_build_object('id',e->>'id','name',e->>'name','position',e->>'position','positions',e->'positions','status',e->>'status','active',coalesce(e->'active','true'::jsonb),'isLeader',coalesce(e->'isLeader','false'::jsonb))),'[]') into staff
 from public.agency_crm_state s,jsonb_array_elements(s.payload->'employees') e where s.id='marketizo-main' and access->'ids' ? (e->>'id');
 select coalesce(jsonb_agg(jsonb_build_object('id',c->>'id','name',c->>'name') order by c->>'name'),'[]') into clients from public.agency_crm_state s,jsonb_array_elements(coalesce(s.payload->'clients','[]')) c where s.id='marketizo-main' and coalesce(c->>'status','') not in ('Arhiviran','Neaktivan');
 select coalesce(jsonb_agg(jsonb_build_object('id',a->>'id','name',a->>'name') order by a->>'name'),'[]') into activities from jsonb_array_elements(coalesce(doc->'activities','[]')) a;
 return jsonb_build_object('ok',true,'clients',clients,'activities',activities,'entries',records,'employeeIds',access->'ids','employees',staff,'scope',case when (access->>'owner')::boolean then 'all' else 'team' end,'viewer',jsonb_build_object('id',p_actor,'name',access->>'actorName'),'updatedAt',stamp);
end $$;
create or replace function public.marketizo_employee_kpi_save(p_actor text,p_action text,p_request_id uuid,p_entry jsonb)
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='2s' set statement_timeout='5s' as $$
declare access jsonb; doc jsonb; entry jsonb; prior jsonb; op jsonb; idx integer; event_date date; n integer; stamp timestamptz:=clock_timestamp(); target text; desired text; request text:=p_request_id::text;
begin
 access=public.marketizo_employee_kpi_scope(p_actor);
 if access is null then return jsonb_build_object('ok',false,'status',403);end if;
 if p_request_id is null or jsonb_typeof(p_entry) is distinct from 'object' or octet_length(p_entry::text)>14000 or coalesce(p_action,'') not in ('create','status') then return jsonb_build_object('ok',false,'status',400);end if;
 if p_action='create' then
  if exists(select 1 from jsonb_object_keys(p_entry) k where k not in ('employeeId','kind','date','clientId','clientName','activity','severity','score','expected','actual','cause','evidence','correction','deadline','status')) then return jsonb_build_object('ok',false,'status',400);end if;
  target=p_entry->>'employeeId';
  if not (access->'ids' ? target) then return jsonb_build_object('ok',false,'status',403);end if;
  if coalesce(p_entry->>'kind','') not in ('incident','rating') or coalesce(p_entry->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then return jsonb_build_object('ok',false,'status',400);end if;
  if exists(select 1 from jsonb_each(p_entry) x where x.key not in ('severity','score') and jsonb_typeof(x.value)<>'string') then return jsonb_build_object('ok',false,'status',400);end if;
  event_date=(p_entry->>'date')::date;
  if event_date<'2000-01-01'::date or event_date>(stamp at time zone 'Europe/Vienna')::date then return jsonb_build_object('ok',false,'status',400);end if;
  if char_length(coalesce(p_entry->>'actual','')) not between 3 and 2000 or char_length(coalesce(p_entry->>'activity','')) not between 1 and 120
   or char_length(coalesce(p_entry->>'expected',''))>2000 or char_length(coalesce(p_entry->>'correction',''))>500
   or char_length(coalesce(p_entry->>'clientName',''))>200 or char_length(coalesce(p_entry->>'cause',''))>120 or char_length(coalesce(p_entry->>'evidence',''))>1500 then return jsonb_build_object('ok',false,'status',400);end if;
  if coalesce(p_entry->>'evidence','')<>'' and p_entry->>'evidence' !~ '^https?://' then return jsonb_build_object('ok',false,'status',400);end if;
  if coalesce(p_entry->>'clientId','')<>'' and not exists(select 1 from public.agency_crm_state s,jsonb_array_elements(s.payload->'clients') c where s.id='marketizo-main' and c->>'id'=p_entry->>'clientId') then return jsonb_build_object('ok',false,'status',400);end if;
  if coalesce(p_entry->>'deadline','')<>'' then
   if p_entry->>'deadline' !~ '^\d{4}-\d{2}-\d{2}$' or (p_entry->>'deadline')::date<event_date then return jsonb_build_object('ok',false,'status',400);end if;
  end if;
  if p_entry->>'kind'='incident' then
   if coalesce(p_entry->>'severity','') !~ '^[1-5]$' or coalesce(p_entry->>'status','') not in ('pending','confirmed') then return jsonb_build_object('ok',false,'status',400);end if;
   if p_entry->>'status'='confirmed' and p_entry->>'cause' is distinct from 'Propust zaposlenog' then return jsonb_build_object('ok',false,'status',400);end if;
  else
   if coalesce(p_entry->>'score','') !~ '^[1-5]$' or p_entry->>'status' is distinct from 'active' then return jsonb_build_object('ok',false,'status',400);end if;
  end if;
 else
  if exists(select 1 from jsonb_object_keys(p_entry) k where k not in ('id','status','note','revision')) or char_length(coalesce(p_entry->>'note','')) not between 3 and 1000 then return jsonb_build_object('ok',false,'status',400);end if;
 end if;
 -- Only this separate row is ever locked or written. Work logging has a different key.
 insert into public.agency_crm_state(id,payload,updated_at) values('marketizo-employee-kpi-v1','{"format":"marketizo-employee-kpi-v1","entries":[]}',stamp) on conflict(id) do nothing;
 select payload into doc from public.agency_crm_state where id='marketizo-employee-kpi-v1' for update;
 if doc->>'format' is distinct from 'marketizo-employee-kpi-v1' then raise exception 'Invalid KPI storage format';end if;
 if exists(select 1 from jsonb_array_elements(doc->'entries') e,jsonb_array_elements(e->'history') h where h->>'requestId'=request and e->>'id' is distinct from case when p_action='create' then request else p_entry->>'id' end) then return jsonb_build_object('ok',false,'status',409);end if;
 if p_action='create' then
  select e into prior from jsonb_array_elements(doc->'entries') e where e->>'id'=request;
  if prior is not null then
   if prior->>'createdBy' is distinct from p_actor or prior->'intent' is distinct from p_entry then return jsonb_build_object('ok',false,'status',409);end if;
   return jsonb_build_object('ok',true,'duplicate',true,'entry',prior-'intent');
  end if;
  entry=p_entry||jsonb_build_object('id',request,'createdAt',stamp,'createdBy',p_actor,'createdByName',access->>'actorName','employeeName',(select e->>'name' from public.agency_crm_state s,jsonb_array_elements(s.payload->'employees') e where s.id='marketizo-main' and e->>'id'=target),'clientName',coalesce(nullif(p_entry->>'clientName',''),(select c->>'name' from public.agency_crm_state s,jsonb_array_elements(s.payload->'clients') c where s.id='marketizo-main' and c->>'id'=p_entry->>'clientId'),''),'revision',1,'intent',p_entry,
   'history',jsonb_build_array(jsonb_build_object('requestId',request,'actorId',p_actor,'actorName',access->>'actorName','at',stamp,'revision',1,'status',p_entry->>'status','note','Kreiran unos')));
  doc=jsonb_set(doc,'{entries}',(doc->'entries')||jsonb_build_array(entry));
 else
  select e,(ord-1)::integer into prior,idx from jsonb_array_elements(doc->'entries') with ordinality x(e,ord) where e->>'id'=p_entry->>'id';
  if prior is null then return jsonb_build_object('ok',false,'status',404);end if;
  if not(access->'ids' ? (prior->>'employeeId')) then return jsonb_build_object('ok',false,'status',403);end if;
  select h into op from jsonb_array_elements(prior->'history') h where h->>'requestId'=request;
  if op is not null then
   if op->>'actorId' is distinct from p_actor or op->>'status' is distinct from p_entry->>'status' or op->>'note' is distinct from p_entry->>'note' then return jsonb_build_object('ok',false,'status',409);end if;
   return jsonb_build_object('ok',true,'duplicate',true,'entry',prior-'intent');
  end if;
  if coalesce(p_entry->>'revision','') !~ '^\d+$' or (p_entry->>'revision')::integer<>(prior->>'revision')::integer then return jsonb_build_object('ok',false,'status',409);end if;
  desired=coalesce(p_entry->>'status','');
  if prior->>'kind'='incident' then
   if not ((prior->>'status'='pending' and desired in ('confirmed','dismissed')) or (prior->>'status'='confirmed' and desired in ('resolved','dismissed')) or (prior->>'status'='resolved' and desired in ('confirmed','dismissed')) or (prior->>'status'='dismissed' and desired='pending')) then return jsonb_build_object('ok',false,'status',400);end if;
  elsif not((prior->>'status'='active' and desired='void') or (prior->>'status'='void' and desired='active')) then return jsonb_build_object('ok',false,'status',400);end if;
  n=(prior->>'revision')::integer+1;
  entry=prior||jsonb_build_object('status',desired,'updatedAt',stamp,'revision',n,'history',(prior->'history')||jsonb_build_array(jsonb_build_object('requestId',request,'actorId',p_actor,'actorName',access->>'actorName','at',stamp,'revision',n,'status',desired,'note',p_entry->>'note')));
  if desired='confirmed' then entry=entry||jsonb_build_object('cause','Propust zaposlenog');end if;
  doc=jsonb_set(doc,array['entries',idx::text],entry);
 end if;
 update public.agency_crm_state set payload=doc,updated_at=stamp where id='marketizo-employee-kpi-v1';
 return jsonb_build_object('ok',true,'entry',entry-'intent');
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then return jsonb_build_object('ok',false,'status',400);
end $$;
create or replace function public.marketizo_employee_kpi_activity_save(p_actor text,p_request_id uuid,p_entry jsonb)
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='2s' set statement_timeout='5s' as $$
declare access jsonb; doc jsonb; prior jsonb; item jsonb; label text; stamp timestamptz:=clock_timestamp();
begin
 access=public.marketizo_employee_kpi_scope(p_actor);
 if access is null then return jsonb_build_object('ok',false,'status',403);end if;
 if p_request_id is null or jsonb_typeof(p_entry) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_entry) k where k<>'name') or jsonb_typeof(p_entry->'name') is distinct from 'string' then return jsonb_build_object('ok',false,'status',400);end if;
 label=regexp_replace(btrim(p_entry->>'name'),'\s+',' ','g');
 if char_length(label) not between 2 and 120 then return jsonb_build_object('ok',false,'status',400);end if;
 insert into public.agency_crm_state(id,payload,updated_at) values('marketizo-employee-kpi-v1','{"format":"marketizo-employee-kpi-v1","entries":[],"activities":[]}',stamp) on conflict(id) do nothing;
 select payload into doc from public.agency_crm_state where id='marketizo-employee-kpi-v1' for update;
 if doc->>'format' is distinct from 'marketizo-employee-kpi-v1' then raise exception 'Invalid KPI storage format';end if;
 select a into prior from jsonb_array_elements(coalesce(doc->'activities','[]')) a where a->>'id'=p_request_id::text;
 if prior is not null then
  if prior->>'createdBy' is distinct from p_actor or prior->>'name' is distinct from label then return jsonb_build_object('ok',false,'status',409);end if;
  return jsonb_build_object('ok',true,'duplicate',true,'entry',jsonb_build_object('id',prior->>'id','name',prior->>'name'));
 end if;
 select a into prior from jsonb_array_elements(coalesce(doc->'activities','[]')) a where lower(a->>'name')=lower(label);
 if prior is not null then return jsonb_build_object('ok',true,'duplicate',true,'entry',jsonb_build_object('id',prior->>'id','name',prior->>'name'));end if;
 item=jsonb_build_object('id',p_request_id,'name',label,'createdAt',stamp,'createdBy',p_actor);
 update public.agency_crm_state set payload=jsonb_set(doc,'{activities}',coalesce(doc->'activities','[]')||jsonb_build_array(item)),updated_at=stamp where id='marketizo-employee-kpi-v1';
 return jsonb_build_object('ok',true,'entry',jsonb_build_object('id',p_request_id,'name',label));
end $$;
revoke all on function public.marketizo_employee_kpi_scope(text) from public,anon,authenticated;
revoke all on function public.marketizo_employee_kpi_read(text) from public,anon,authenticated;
revoke all on function public.marketizo_employee_kpi_save(text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_employee_kpi_scope(text),public.marketizo_employee_kpi_read(text),public.marketizo_employee_kpi_save(text,text,uuid,jsonb) to service_role;
revoke all on function public.marketizo_employee_kpi_activity_save(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_employee_kpi_activity_save(text,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
