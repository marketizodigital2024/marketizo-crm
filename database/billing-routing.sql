-- View finance-only parties as clients only inside invoice/payment transactions.
create or replace function public.marketizo_billing_scope(p_main jsonb)
returns jsonb language sql immutable security invoker set search_path=public,pg_temp as $$
 select jsonb_set(p_main,'{clients}',coalesce(p_main->'clients','[]'::jsonb)||coalesce(p_main->'billingOneOffClients','[]'::jsonb));
$$;
create or replace function public.marketizo_billing_unscoped(p_main jsonb)
returns jsonb language sql immutable security invoker set search_path=public,pg_temp as $$
 select case when p_main ? 'billingOneOffClients' then p_main||jsonb_build_object(
 'clients',coalesce((select jsonb_agg(c) from jsonb_array_elements(p_main->'clients') c where not exists(select 1 from jsonb_array_elements(p_main->'billingOneOffClients') o where o->>'id'=c->>'id')),'[]'::jsonb),
 'billingOneOffClients',coalesce((select jsonb_agg(c) from jsonb_array_elements(p_main->'clients') c where exists(select 1 from jsonb_array_elements(p_main->'billingOneOffClients') o where o->>'id'=c->>'id')),'[]'::jsonb)) else p_main end;
$$;
revoke all on function public.marketizo_billing_scope(jsonb),public.marketizo_billing_unscoped(jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_billing_scope(jsonb),public.marketizo_billing_unscoped(jsonb) to service_role;

-- Validate every project and the shared recipient inside the same transaction as issuance.
create or replace function public.marketizo_billing_members(p_main jsonb,p_snap jsonb)
returns jsonb language plpgsql immutable security invoker set search_path=public,pg_temp as $$
declare primary_client jsonb; recipient jsonb; route jsonb; member jsonb; c jsonb; item jsonb; result jsonb:='[]'; group_id text; recipient_id text; expected_count int; n bigint:=0; v bigint:=0; g bigint:=0;
begin
 select value into primary_client from jsonb_array_elements(p_main->'clients') where value->>'id'=p_snap->>'clientId';
 if primary_client is null then raise exception 'Client not found';end if;
 if p_snap->'routing' is null then
  if nullif(primary_client->>'billingGroupId','') is not null or nullif(primary_client->>'billingRecipientId','') is not null then raise exception 'Billing routing changed; preview again';end if;
  if primary_client->'billingProfile' is distinct from p_snap->'profile' then raise exception 'Client profile changed';end if;
  if coalesce(primary_client->>'billingFrequency','monthly') is distinct from coalesce(p_snap->>'billingFrequency','monthly') or (primary_client->>'billingFrequency'='once' and p_snap->>'serviceMonth' is distinct from left(coalesce(nullif(primary_client->>'invoiceStartMonth',''),primary_client->>'startDate'),7)) then raise exception 'Client billing frequency or month changed';end if;
  return jsonb_build_array(jsonb_build_object('clientId',p_snap->>'clientId','netCents',p_snap->'netCents','vatCents',p_snap->'vatCents','grossCents',p_snap->'grossCents'));
 end if;
 route:=p_snap->'routing';group_id:=coalesce(primary_client->>'billingGroupId','');recipient_id:=coalesce(nullif(primary_client->>'billingRecipientId',''),primary_client->>'id');
 if route->>'primaryId' is distinct from p_snap->>'clientId' or route->>'groupId' is distinct from group_id or route->>'recipientId' is distinct from recipient_id or (group_id<>'' and group_id<>primary_client->>'id') then raise exception 'Billing routing changed';end if;
 select value into recipient from jsonb_array_elements(p_main->'clients') where value->>'id'=recipient_id;
 if jsonb_build_object('clientId',recipient->>'id','name',recipient->>'name','country',coalesce(recipient->>'country',''),'email',recipient->'email','billingName',coalesce(recipient->>'billingName','')) is distinct from route->'recipient' then raise exception 'Billing recipient changed';end if;
 if recipient is null or recipient->'billingProfile' is distinct from p_snap->'profile' or recipient->'billingProfile'->'confirmed' is distinct from 'true'::jsonb or coalesce(nullif(recipient->>'billingRecipientId',''),recipient_id)<>recipient_id then raise exception 'Client profile changed';end if;
 if jsonb_typeof(route->'members') is distinct from 'array' or jsonb_typeof(p_snap->'items') is distinct from 'array' then raise exception 'Billing members missing';end if;
 expected_count:=case when group_id='' then 1 else (select count(*) from jsonb_array_elements(p_main->'clients') x where x->>'billingGroupId'=group_id) end;
 if expected_count<1 or expected_count>10 or (group_id<>'' and expected_count<2) or jsonb_array_length(route->'members')<>expected_count or jsonb_array_length(p_snap->'items')<>expected_count or (select count(distinct x->>'clientId') from jsonb_array_elements(p_snap->'items') x)<>expected_count or (select count(distinct x->>'clientId') from jsonb_array_elements(route->'members') x)<>expected_count then raise exception 'Billing members changed';end if;
 for member in select value from jsonb_array_elements(route->'members') loop
  select value into c from jsonb_array_elements(p_main->'clients') where value->>'id'=member->>'clientId';
  if c is null or (group_id='' and c->>'id'<>primary_client->>'id') or (group_id<>'' and c->>'billingGroupId' is distinct from group_id) or coalesce(c->>'status','Aktivan')<>'Aktivan' or coalesce(c->>'billingGroupId','') is distinct from member->>'billingGroupId' or coalesce(c->>'billingRecipientId','') is distinct from member->>'billingRecipientId' or c->>'name' is distinct from member->>'clientName' or coalesce(c->>'billingFrequency','monthly') is distinct from member->>'billingFrequency' or left(coalesce(nullif(c->>'invoiceStartMonth',''),c->>'startDate',''),7) is distinct from member->>'invoiceStartMonth' then raise exception 'Billing routing changed';end if;
  if nullif(c->>'billingRecipientId','') is not null and c->>'billingRecipientId'<>recipient_id then raise exception 'Billing recipient changed';end if;
  if c->'invoiceExcludedMonths' ? (p_snap->>'serviceMonth') or (c->>'billingFrequency'='once' and p_snap->>'serviceMonth' is distinct from left(coalesce(nullif(c->>'invoiceStartMonth',''),c->>'startDate'),7)) then raise exception 'Client billing frequency or month changed';end if;
  select value into item from jsonb_array_elements(p_snap->'items') where value->>'clientId'=c->>'id';
  if item is null or (item->>'quantity')::bigint<1 or (item->>'unitCents')::bigint<1 or (item->>'quantity')::bigint*(item->>'unitCents')::bigint<>(item->>'netCents')::bigint or (item->>'netCents')::bigint+(item->>'vatCents')::bigint<>(item->>'grossCents')::bigint or (item->>'vatCents')::bigint<>(case when recipient->'billingProfile'->>'taxMode'='standard20' then round((item->>'netCents')::numeric*.2)::bigint else 0 end) then raise exception 'Invalid invoice item totals';end if;
  n:=n+(item->>'netCents')::bigint;v:=v+(item->>'vatCents')::bigint;g:=g+(item->>'grossCents')::bigint;result:=result||jsonb_build_array(item);
 end loop;
 if n is distinct from (p_snap->>'netCents')::bigint or v is distinct from (p_snap->>'vatCents')::bigint or g is distinct from (p_snap->>'grossCents')::bigint then raise exception 'Invalid grouped invoice totals';end if;
 return result;
end;
$$;
revoke all on function public.marketizo_billing_members(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_billing_members(jsonb,jsonb) to service_role;
