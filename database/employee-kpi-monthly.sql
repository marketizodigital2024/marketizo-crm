-- Monthly reviews and approvals live in a separate state row; no work/auth writes.
begin;
set local lock_timeout='2s';
create or replace function public.marketizo_employee_kpi_client_scores(p_actor text,p_month text)
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='5s' as $$
declare access jsonb; feedback jsonb; available boolean; result jsonb;
begin
 access=public.marketizo_employee_kpi_scope(p_actor);
 if access is null then return jsonb_build_object('ok',false,'status',403);end if;
 if coalesce(p_month,'') !~ '^\d{4}-(0[1-9]|1[0-2])$' then return jsonb_build_object('ok',false,'status',400);end if;
 select payload into feedback from public.agency_crm_state where id='marketizo-kpi-v1';available=found;
 if jsonb_typeof(coalesce(feedback->'responses','[]'))<>'array' then raise exception 'Invalid client feedback storage';end if;
 with answers as (
  select distinct p->>'employeeId' employee_id,r->>'clientId' client_id,r->>'clientName' client_name,r->>'id' response_id,r->>'submittedAt' submitted_at,q->>'id' question_id,(r->'answers'->>(q->>'id'))::numeric score
  from jsonb_array_elements(coalesce(feedback->'responses','[]')) r,
   jsonb_array_elements(coalesce(r->'team','[]')) p,jsonb_array_elements(coalesce(r->'questions','[]')) q
  where r->>'month'=p_month and coalesce(r->>'clientId','')<>'' and coalesce(r->>'id','')<>''
   and access->'ids' ? (p->>'employeeId') and q->>'type'='rating' and q->>'target'<>'team' and q->>'target'=p->>'role'
   and (case when coalesce(q->>'targetEmployeeId','')<>'' then q->>'targetEmployeeId'=p->>'employeeId' else coalesce(q->>'targetName','')<>'' and q->>'targetName'=p->>'name' end)
   and coalesce(r->'answers'->>(q->>'id'),'') ~ '^[1-5]$'
 ), per_response as (
  select employee_id,client_id,max(client_name) client_name,response_id,submitted_at,avg(score) score,count(*)::integer answer_count
  from answers group by employee_id,client_id,response_id,submitted_at
 ), latest as (
  select distinct on (employee_id,client_id) * from per_response order by employee_id,client_id,submitted_at desc nulls last,response_id desc
 ), per_person as (
  select employee_id,avg(score) score,count(*)::integer client_count,sum(answer_count)::integer answer_count,
   jsonb_agg(jsonb_build_object('clientId',client_id,'clientName',client_name,'responseId',response_id,'submittedAt',submitted_at,'score',score,'answerCount',answer_count) order by client_id) items
  from latest group by employee_id
 ) select coalesce(jsonb_agg(jsonb_build_object('employeeId',employee_id,'score',score,'clientCount',client_count,'responseCount',client_count,'answerCount',answer_count,'items',items,'fingerprint',md5(items::text)) order by employee_id),'[]') into result from per_person;
 return jsonb_build_object('ok',true,'month',p_month,'employeeIds',access->'ids','sourceAvailable',available,'clients',result);
end $$;
create or replace function public.marketizo_employee_kpi_monthly_calculation(p_score integer,p_client jsonb)
returns jsonb language sql immutable security invoker set search_path='' as $
 select jsonb_build_object('formula','marketizo70-30-simple-v2','scale',3,'leaderScore',p_score,'internalScore',p_score,'internalContribution',p_score::numeric*.7,'clientNormalized',case when p_client is null then null else 1+((p_client->>'score')::numeric-1)/2 end,'client',p_client,'clientFingerprint',coalesce(p_client->>'fingerprint','none'),'total',case when p_client is null then null else round(p_score::numeric*.7+(1+((p_client->>'score')::numeric-1)/2)*.3,2) end);
$;
revoke all on function public.marketizo_employee_kpi_monthly_calculation(integer,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_employee_kpi_monthly_calculation(integer,jsonb) to service_role;
create or replace function public.marketizo_employee_kpi_monthly_read(p_actor text,p_month text)
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='5s' as $$
declare access jsonb; doc jsonb; records jsonb; clients jsonb;
begin
 access=public.marketizo_employee_kpi_scope(p_actor);
 if access is null then return jsonb_build_object('ok',false,'status',403);end if;
 clients=public.marketizo_employee_kpi_client_scores(p_actor,p_month);
 if clients->>'ok'<>'true' then return clients;end if;
 select payload into doc from public.agency_crm_state where id='marketizo-employee-kpi-monthly-v1';
 select coalesce(jsonb_agg(e order by e->>'employeeId'),'[]') into records from jsonb_array_elements(coalesce(doc->'reviews','[]')) e where e->>'month'=p_month and access->'ids' ? (e->>'employeeId');
 select coalesce(jsonb_agg(case when e->>'model'='simple-v2' then e||jsonb_build_object('calculation',public.marketizo_employee_kpi_monthly_calculation((e->>'leaderScore')::integer,(select c from jsonb_array_elements(clients->'clients') c where c->>'employeeId'=e->>'employeeId'))) else e end),'[]') into records from jsonb_array_elements(records) e;
 return clients||jsonb_build_object('reviews',records,'canApprove',(access->>'owner')::boolean);
end $$;
create or replace function public.marketizo_employee_kpi_monthly_save(p_actor text,p_action text,p_request_id uuid,p_entry jsonb)
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='2s' set statement_timeout='5s' as $$
declare access jsonb; doc jsonb; prior jsonb; item jsonb; op jsonb; idx integer; stamp timestamptz:=clock_timestamp(); target text; month text; rev integer; criteria jsonb; clients jsonb; client jsonb; contribution numeric; internal numeric; total numeric; history jsonb; approval jsonb;
begin
 access=public.marketizo_employee_kpi_scope(p_actor);
 if access is null then return jsonb_build_object('ok',false,'status',403);end if;
 if p_request_id is null or coalesce(p_action,'') not in ('submit','approve','return') or jsonb_typeof(p_entry) is distinct from 'object' or octet_length(p_entry::text)>10000 then return jsonb_build_object('ok',false,'status',400);end if;
 if p_action<>'submit' and access->>'owner' is distinct from 'true' then return jsonb_build_object('ok',false,'status',403);end if;
 if coalesce(p_entry->>'revision','') !~ '^\d{1,9}$' then return jsonb_build_object('ok',false,'status',400);end if;
 if p_action='submit' then
  if exists(select 1 from jsonb_object_keys(p_entry) k where k not in ('employeeId','month','criteria','leaderScore','comment','revision')) then return jsonb_build_object('ok',false,'status',400);end if;
  target=p_entry->>'employeeId';month=p_entry->>'month';criteria=p_entry->'criteria';
  if not(access->'ids' ? target) then return jsonb_build_object('ok',false,'status',403);end if;
  if coalesce(month,'') !~ '^\d{4}-(0[1-9]|1[0-2])$' or month<'2000-01' or month>to_char(stamp at time zone 'Europe/Vienna','YYYY-MM') then return jsonb_build_object('ok',false,'status',400);end if;
  if p_entry ? 'leaderScore' then
   if (p_entry->'leaderScore')::text !~ '^[1-3]$' or p_entry ? 'criteria' then return jsonb_build_object('ok',false,'status',400);end if;
  else
  if jsonb_typeof(criteria) is distinct from 'object' or not(criteria ?& array['quality','deadlines','communication','independence']) then return jsonb_build_object('ok',false,'status',400);end if;
  if exists(select 1 from jsonb_each(criteria) x where x.key not in ('quality','deadlines','communication','independence') or x.value::text !~ '^[1-5]$') or jsonb_typeof(p_entry->'comment') is distinct from 'string' or char_length(btrim(p_entry->>'comment')) not between 3 and 1200 then return jsonb_build_object('ok',false,'status',400);end if;
  end if;
  if jsonb_typeof(p_entry->'comment') is distinct from 'string' or char_length(btrim(p_entry->>'comment')) not between 3 and 1200 then return jsonb_build_object('ok',false,'status',400);end if;
 else
  if exists(select 1 from jsonb_object_keys(p_entry) k where k not in ('id','revision','note','clientFingerprint')) or jsonb_typeof(p_entry->'id') is distinct from 'string' or jsonb_typeof(p_entry->'note') is distinct from 'string' or char_length(p_entry->>'note')>1000 then return jsonb_build_object('ok',false,'status',400);end if;
  if p_action='return' and char_length(btrim(p_entry->>'note'))<3 then return jsonb_build_object('ok',false,'status',400);end if;
 end if;
 insert into public.agency_crm_state(id,payload,updated_at) values('marketizo-employee-kpi-monthly-v1','{"format":"marketizo-employee-kpi-monthly-v1","reviews":[]}',stamp) on conflict(id) do nothing;
 select payload into doc from public.agency_crm_state where id='marketizo-employee-kpi-monthly-v1' for update;
 if doc->>'format' is distinct from 'marketizo-employee-kpi-monthly-v1' then raise exception 'Invalid monthly KPI storage';end if;
 if p_action='submit' then
  select e,(ord-1)::integer into prior,idx from jsonb_array_elements(doc->'reviews') with ordinality x(e,ord) where e->>'employeeId'=target and e->>'month'=month;
 else
  select e,(ord-1)::integer into prior,idx from jsonb_array_elements(doc->'reviews') with ordinality x(e,ord) where e->>'id'=p_entry->>'id';
  if prior is null then return jsonb_build_object('ok',false,'status',404);end if;
  if prior->>'model'='simple-v2' then return jsonb_build_object('ok',false,'status',409);end if;
  target=prior->>'employeeId';month=prior->>'month';
  if not(access->'ids' ? target) then return jsonb_build_object('ok',false,'status',403);end if;
 end if;
 if exists(select 1 from jsonb_array_elements(doc->'reviews') e,jsonb_array_elements(coalesce(e->'history','[]')) h where h->>'requestId'=p_request_id::text and (prior is null or e->>'id'<>prior->>'id')) then return jsonb_build_object('ok',false,'status',409);end if;
 select h into op from jsonb_array_elements(coalesce(prior->'history','[]')) h where h->>'requestId'=p_request_id::text;
 if op is not null then
  if op->>'actorId' is distinct from p_actor or op->>'action' is distinct from p_action or op->'intent' is distinct from p_entry then return jsonb_build_object('ok',false,'status',409);end if;
  return jsonb_build_object('ok',true,'duplicate',true,'entry',prior);
 end if;
 rev=coalesce((prior->>'revision')::integer,0);
 if (p_entry->>'revision')::integer<>rev then return jsonb_build_object('ok',false,'status',409);end if;
 if p_action='submit' then
  if prior->>'status'='approved' then return jsonb_build_object('ok',false,'status',409);end if;
  item=coalesce(prior,jsonb_build_object('id',p_request_id,'employeeId',target,'month',month,'createdAt',stamp,'createdBy',p_actor,'employeeName',(select e->>'name' from public.agency_crm_state s,jsonb_array_elements(s.payload->'employees') e where s.id='marketizo-main' and e->>'id'=target)))||jsonb_build_object('criteria',criteria,'comment',btrim(p_entry->>'comment'),'status','pending','submittedAt',stamp,'submittedBy',p_actor,'submittedByName',access->>'actorName');
  item=item-'approval';
  if p_entry ? 'leaderScore' then item=(item-'criteria')||jsonb_build_object('leaderScore',(p_entry->>'leaderScore')::integer,'model','simple-v2','status','recorded');
   clients=public.marketizo_employee_kpi_client_scores(p_actor,month);select c into client from jsonb_array_elements(clients->'clients') c where c->>'employeeId'=target;
   item=item||jsonb_build_object('calculation',public.marketizo_employee_kpi_monthly_calculation((p_entry->>'leaderScore')::integer,client));
  else item=(item-'leaderScore'-'model');end if;
 elsif p_action='approve' then
  if prior->>'status' not in ('pending','approved') then return jsonb_build_object('ok',false,'status',409);end if;
  clients=public.marketizo_employee_kpi_client_scores(p_actor,month);
  select c into client from jsonb_array_elements(clients->'clients') c where c->>'employeeId'=target;
  if p_entry->>'clientFingerprint' is distinct from coalesce(client->>'fingerprint','none') then return jsonb_build_object('ok',false,'status',409);end if;
  criteria=prior->'criteria';contribution=(criteria->>'quality')::numeric*.25+(criteria->>'deadlines')::numeric*.20+(criteria->>'communication')::numeric*.15+(criteria->>'independence')::numeric*.10;internal=contribution/.70;
  total=case when client is null then null else round(contribution+(client->>'score')::numeric*.30,2) end;
  approval=jsonb_build_object('by',p_actor,'byName',access->>'actorName','at',stamp,'note',p_entry->>'note','formula','marketizo70-30-v1','weights',jsonb_build_object('quality',25,'deadlines',20,'communication',15,'independence',10,'clients',30),'criteria',criteria,'internalContribution',contribution,'internalScore',internal,'client',client,'clientFingerprint',coalesce(client->>'fingerprint','none'),'total',total);
  item=prior||jsonb_build_object('status','approved','approval',approval);
 else
  if prior->>'status' not in ('pending','approved') then return jsonb_build_object('ok',false,'status',409);end if;
  item=(prior-'approval')||jsonb_build_object('status','returned','returnNote',btrim(p_entry->>'note'));
 end if;
 history=coalesce(prior->'history','[]')||jsonb_build_array(jsonb_build_object('requestId',p_request_id,'actorId',p_actor,'actorName',access->>'actorName','action',p_action,'at',stamp,'intent',p_entry,'approval',case when p_action='approve' then approval else prior->'approval' end));
 item=item||jsonb_build_object('revision',rev+1,'updatedAt',stamp,'history',history);
 if prior is null then doc=jsonb_set(doc,'{reviews}',(doc->'reviews')||jsonb_build_array(item));else doc=jsonb_set(doc,array['reviews',idx::text],item);end if;
 update public.agency_crm_state set payload=doc,updated_at=stamp where id='marketizo-employee-kpi-monthly-v1';
 return jsonb_build_object('ok',true,'entry',item);
end $$;
revoke all on function public.marketizo_employee_kpi_client_scores(text,text),public.marketizo_employee_kpi_monthly_read(text,text),public.marketizo_employee_kpi_monthly_save(text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_employee_kpi_client_scores(text,text),public.marketizo_employee_kpi_monthly_read(text,text),public.marketizo_employee_kpi_monthly_save(text,text,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
