-- Service-only, atomic invoice state machine. Invoice/PDF rows use the existing
-- private state store, so they are included in both verified backup domains.
create or replace function public.marketizo_billing_flow(p_organization text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 settings_id text := 'finance-billing-settings-'||md5(p_organization);
 doc_id text := 'finance-billing-invoice-'||coalesce(p_data->>'id','');
 cfg jsonb; doc jsonb; snap jsonb; result jsonb; n integer; rev integer; token text;
 now_at timestamptz := clock_timestamp(); main jsonb; clients jsonb; client jsonb; inv jsonb; idx integer;
begin
 if p_organization is null or length(p_organization)>100 or length(p_organization)<3 then raise exception 'Invalid organization';end if;
 select payload into cfg from public.agency_crm_state where id=settings_id for update;
 if cfg is null then
  cfg:=jsonb_build_object('organization',p_organization,'nextNumber',634,'numberingConfirmed',true,'deliveryReady',false,'sender','buchhaltung@marketizo.com','labelName','Poslati računi','archiveRootName','Marketizo računi');
  if p_action<>'settings' then insert into public.agency_crm_state(id,payload,updated_at) values(settings_id,cfg,now_at) on conflict(id) do nothing;select payload into cfg from public.agency_crm_state where id=settings_id for update;end if;
 end if;
 if p_action='settings' then return cfg;end if;
 if p_action='list' then
  select coalesce(jsonb_agg(x.doc order by x.doc->>'createdAt' desc),'[]'::jsonb) into result from (select payload-'pdfBase64' as doc from public.agency_crm_state where id like 'finance-billing-invoice-%' and payload->>'organization'=p_organization order by payload->>'createdAt' desc limit 200)x;
  return jsonb_build_object('settings',cfg,'invoices',result);
 end if;
 if p_action='heartbeat' then
  cfg:=cfg||jsonb_build_object('workerAt',now_at,'deliveryReady',p_data->'ready'='true'::jsonb,'labelId',p_data->>'labelId','archiveRootId',p_data->>'archiveRootId','workerError',left(coalesce(p_data->>'error',''),300));
  update public.agency_crm_state set payload=cfg,updated_at=now_at where id=settings_id;return cfg;
 end if;
 if p_action='claim' then
  select payload,id into doc,doc_id from public.agency_crm_state where id like 'finance-billing-invoice-%' and payload->>'organization'=p_organization and (payload->>'status' in('queued','prepared','sending','uncertain') or (payload->>'status'='sent' and coalesce(payload->>'archiveStatus','')<>'complete')) and coalesce((payload->>'leaseUntil')::timestamptz,'1970-01-01'::timestamptz)<now_at order by payload->>'issuedAt' limit 1 for update skip locked;
  if doc is null then return jsonb_build_object('invoice',null);end if;
  token:=gen_random_uuid()::text;doc:=doc||jsonb_build_object('leaseToken',token,'leaseUntil',now_at+interval '5 minutes');
  update public.agency_crm_state set payload=doc,updated_at=now_at where id=doc_id;return jsonb_build_object('invoice',doc);
 end if;
 if coalesce(p_data->>'id','')!~'^[a-f0-9-]{36}$' then raise exception 'Invalid invoice ID';end if;
 select payload into doc from public.agency_crm_state where id=doc_id for update;
 if doc is not null and doc->>'organization'is distinct from p_organization then raise exception 'Invalid invoice organization';end if;
 if p_action='get' then if doc is null then raise exception 'Invoice not found';end if;return doc;end if;
 if p_action='draft' then
  if p_data->'snapshot' is null or jsonb_typeof(p_data->'snapshot') is distinct from 'object' then raise exception 'Missing snapshot';end if;
  if nullif(p_data->'snapshot'->>'clientId','') is null or nullif(p_data->'snapshot'->>'profileHash','') is null or p_data->'snapshot'->'profile' is null then raise exception 'Missing client profile';end if;
  if not (p_data->'snapshot' ?& array['netCents','vatCents','grossCents','quantity','unitCents','email','serviceMonth','issueDate','currency']) then raise exception 'Incomplete invoice';end if;
  if (p_data->'snapshot'->>'netCents')::bigint+(p_data->'snapshot'->>'vatCents')::bigint<>(p_data->'snapshot'->>'grossCents')::bigint then raise exception 'Invalid invoice totals';end if;
  if doc is not null and (doc->>'status'<>'draft' or (doc->>'revision')::int<>coalesce((p_data->>'revision')::int,0)) then raise exception 'Invoice changed or already issued';end if;
  snap:=p_data->'snapshot';if jsonb_typeof(snap) is distinct from 'object' or (snap->>'netCents')::bigint<=0 or snap->>'currency' is distinct from 'EUR' then raise exception 'Invalid invoice snapshot';end if;
  rev:=coalesce((doc->>'revision')::int,0)+1;
  doc:=jsonb_build_object('id',p_data->>'id','organization',p_organization,'status','draft','revision',rev,'snapshot',snap,'snapshotHash',encode(sha256(convert_to(snap::text,'UTF8')),'hex'),'createdAt',coalesce(doc->'createdAt',to_jsonb(now_at)),'updatedAt',now_at,'actor',p_data->>'actor');
  insert into public.agency_crm_state(id,payload,updated_at) values(doc_id,doc,now_at) on conflict(id)do update set payload=excluded.payload,updated_at=excluded.updated_at;return doc;
 end if;
 if doc is null then raise exception 'Invoice not found';end if;
 if p_action='preview' then
  if not (p_data ?& array['revision','snapshotHash','number','pdfBase64','pdfSha256']) or nullif(p_data->>'pdfBase64','') is null then raise exception 'Incomplete PDF preview';end if;
  if doc->>'status'<>'draft' or (doc->>'revision')::int is distinct from (p_data->>'revision')::int or doc->>'snapshotHash' is distinct from p_data->>'snapshotHash' then raise exception 'Draft changed';end if;
  if (cfg->>'nextNumber')::int is distinct from (p_data->>'number')::int then raise exception 'Invoice number changed; preview again';end if;
  if length(p_data->>'pdfBase64')>1800000 or substring(decode(p_data->>'pdfBase64','base64') from 1 for 5)<>convert_to('%PDF-','UTF8') or encode(sha256(decode(p_data->>'pdfBase64','base64')),'hex')<>p_data->>'pdfSha256' then raise exception 'Invalid PDF';end if;
  doc:=doc||jsonb_build_object('previewNumber',p_data->'number','pdfBase64',p_data->>'pdfBase64','pdfSha256',p_data->>'pdfSha256');
 elsif p_action='issue' then
  if doc->>'status'<>'draft' then return doc-'pdfBase64';end if;
  if coalesce(cfg->'deliveryReady','false'::jsonb)<>'true'::jsonb or coalesce((cfg->>'workerAt')::timestamptz,'1970-01-01')<now_at-interval '10 minutes' then raise exception 'Gmail and Drive connection is not ready';end if;
  if (doc->>'revision')::int is distinct from (p_data->>'revision')::int or doc->>'snapshotHash' is distinct from p_data->>'snapshotHash' or doc->>'pdfSha256' is null or doc->>'pdfSha256' is distinct from p_data->>'pdfSha256' then raise exception 'Preview and confirm the current PDF';end if;
  n:=(cfg->>'nextNumber')::int;
  if exists(select 1 from public.agency_crm_state s cross join lateral jsonb_each(coalesce(s.payload->'files','{}'::jsonb)) f where s.id='finance-sources-v1' and (f.value->'parsed'->>'number')::int=n) then raise exception 'Invoice number already exists in legacy source';end if;
  if exists(select 1 from public.agency_crm_state s cross join lateral jsonb_each(coalesce(s.payload->'manifests','{}'::jsonb)) m cross join lateral jsonb_array_elements(coalesce(m.value->'files','[]'::jsonb)) f where s.id='finance-sources-v1' and (regexp_match(f->>'name','^Rechnung[_ ]*0*([0-9]{3,6})[_ ]','i'))[1]::int=n) then raise exception 'Invoice number already exists in Drive manifest';end if;
  if (doc->>'previewNumber')::int is distinct from n then raise exception 'Invoice number changed; preview again';end if;
  snap:=doc->'snapshot';if snap->>'profileHash' is distinct from p_data->>'profileHash' then raise exception 'Client profile changed';end if;
  select payload into main from public.agency_crm_state where id=p_organization for update;
  select ordinality::int-1,value into idx,client from jsonb_array_elements(main->'clients') with ordinality where value->>'id'=snap->>'clientId';
  if client is null then raise exception 'Client not found';end if;
  if client->'billingProfile' is distinct from snap->'profile' then raise exception 'Client profile changed';end if;
  inv:=client->'invoices'->(snap->>'serviceMonth');
  if inv->'originalInvoice' is not null or inv->>'invoiceStatus'='Poslat' or coalesce(jsonb_array_length(inv->'payments'),0)>0 or coalesce((inv->>'paidAmount')::numeric,0)>0 then raise exception 'Invoice or payment already exists for this period';end if;
  inv:=coalesce(inv,'{}'::jsonb)||jsonb_build_object('amount',(snap->>'netCents')::numeric/100,'invoiceStatus','Nije poslat','paymentStatus','Nije plaćeno','paymentMethod','Firma','billingInvoiceId',doc->>'id','originalInvoice',jsonb_build_object('source','crm','number',n,'netCents',snap->'netCents','vatCents',snap->'vatCents','grossCents',snap->'grossCents','sha256',doc->>'pdfSha256'));
  client:=jsonb_set(client,'{invoices}',coalesce(client->'invoices','{}'::jsonb)||jsonb_build_object(snap->>'serviceMonth',inv));main:=jsonb_set(main,array['clients',idx::text],client);
  update public.agency_crm_state set payload=main,updated_at=greatest(now_at,updated_at+interval '1 millisecond') where id=p_organization;
  cfg:=jsonb_set(cfg,'{nextNumber}',to_jsonb(n+1));update public.agency_crm_state set payload=cfg,updated_at=now_at where id=settings_id;
  doc:=doc||jsonb_build_object('number',n,'status','queued','issuedAt',now_at,'archiveStatus','pending','messageId','<marketizo-invoice-'||(doc->>'id')||'@marketizo.com>');
 elsif p_action in('prepared','sending','uncertain','sent','archived','defer') then
  if doc->>'leaseToken' is distinct from p_data->>'leaseToken' or coalesce((doc->>'leaseUntil')::timestamptz,'1970-01-01')<now_at then raise exception 'Worker lease expired';end if;
  if p_action in('prepared','sending') then
   select payload into main from public.agency_crm_state where id=p_organization for update;
   select value into client from jsonb_array_elements(main->'clients') where value->>'id'=doc->'snapshot'->>'clientId';
   if client is null or client->'billingProfile' is distinct from doc->'snapshot'->'profile' then raise exception 'Client profile changed; delivery blocked';end if;
  end if;
  if p_action='prepared' then
   if doc->>'status' not in('queued','prepared') or nullif(p_data->>'draftId','') is null then raise exception 'Invalid draft preparation';end if;
   if doc->>'gmailDraftId' is not null and doc->>'gmailDraftId'<>p_data->>'draftId' then raise exception 'A Gmail draft is already assigned';end if;
   doc:=doc||jsonb_build_object('status','prepared','gmailDraftId',p_data->>'draftId');
  elsif p_action='sending' then
   if doc->>'status'<>'prepared' or doc->>'gmailDraftId' is null then raise exception 'Gmail draft not confirmed';end if;doc:=doc||jsonb_build_object('status','sending');
  elsif p_action='sent' then
   if doc->>'status' not in('prepared','sending','uncertain','sent') or nullif(p_data->>'gmailMessageId','') is null or p_data->>'pdfSha256' is distinct from doc->>'pdfSha256' or p_data->>'to' is distinct from doc->'snapshot'->>'email' then raise exception 'Sent message proof is invalid';end if;
   if doc->>'gmailMessageId' is not null and doc->>'gmailMessageId'<>p_data->>'gmailMessageId' then raise exception 'Sent message is already confirmed';end if;
   doc:=doc||jsonb_build_object('status','sent','gmailMessageId',p_data->>'gmailMessageId','sentAt',coalesce(doc->'sentAt',to_jsonb(now_at)),'gmailLabelApplied',p_data->'labelApplied');
   snap:=doc->'snapshot';select payload into main from public.agency_crm_state where id=p_organization for update;
   select ordinality::int-1,value into idx,client from jsonb_array_elements(main->'clients') with ordinality where value->>'id'=snap->>'clientId';
   inv:=client->'invoices'->(snap->>'serviceMonth');
   if inv->>'billingInvoiceId' is distinct from doc->>'id' then raise exception 'CRM invoice link changed';end if;
   inv:=inv||jsonb_build_object('invoiceStatus','Poslat','sentAt',doc->'sentAt','sentEvidence',jsonb_build_object('source','crm-gmail','account','buchhaltung@marketizo.com','messageId',doc->>'gmailMessageId','invoiceNumber',doc->'number','attachmentSha256',doc->>'pdfSha256'));
   client:=jsonb_set(client,array['invoices',snap->>'serviceMonth'],inv);main:=jsonb_set(main,array['clients',idx::text],client);
   update public.agency_crm_state set payload=main,updated_at=greatest(now_at,updated_at+interval '1 millisecond') where id=p_organization;
  elsif p_action='archived' then
   if doc->>'status'<>'sent' or p_data->>'pdfSha256' is distinct from doc->>'pdfSha256' or nullif(p_data->>'driveFileId','') is null then raise exception 'Drive copy not confirmed';end if;
   doc:=doc||jsonb_build_object('archiveStatus','complete','driveFileId',p_data->>'driveFileId','driveFolderId',p_data->>'driveFolderId','gmailLabelApplied',true,'leaseUntil',now_at,'lastError','');
  elsif p_action='uncertain' then
   if doc->>'status'<>'sent' then doc:=doc||jsonb_build_object('status','uncertain');end if;
   doc:=doc||jsonb_build_object('lastError',left(coalesce(p_data->>'error','Slanje nije potvrđeno; potrebna je provera.'),300),'leaseUntil',now_at);
  else doc:=doc||jsonb_build_object('lastError',left(coalesce(p_data->>'error','Provera nije završena.'),300),'leaseUntil',now_at+interval '1 minute');end if;
 else raise exception 'Unsupported billing action';end if;
 doc:=doc||jsonb_build_object('updatedAt',now_at);update public.agency_crm_state set payload=doc,updated_at=now_at where id=doc_id;
 return doc-'pdfBase64';
end;
$$;
revoke all on function public.marketizo_billing_flow(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_billing_flow(text,text,jsonb) to service_role;
