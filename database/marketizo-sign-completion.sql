-- Additive identity completion. Reviewed source PDFs and all old signatures stay immutable.
begin;
create table public.marketizo_sign_completion_requests (
 request_id uuid primary key references public.marketizo_sign_requests(id), created_at timestamptz not null default clock_timestamp()
);
create table public.marketizo_sign_completed_parties (
 party_id uuid primary key references public.marketizo_sign_parties(id), request_id uuid not null references public.marketizo_sign_requests(id),
 recipient jsonb not null, completed_at timestamptz not null default clock_timestamp()
);
create table public.marketizo_sign_completed_pdfs (
 request_id uuid primary key references public.marketizo_sign_requests(id), document jsonb not null, input_sha256 text not null,
 original_pdf bytea not null check(octet_length(original_pdf)<=1000000), sha256 text not null,
 renderer text not null, created_at timestamptz not null default clock_timestamp()
);
do $$ declare tbl text; begin
 foreach tbl in array array['marketizo_sign_completion_requests','marketizo_sign_completed_parties','marketizo_sign_completed_pdfs'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('revoke all on public.%I from public,anon,authenticated',tbl);
  execute format('revoke all on public.%I from service_role',tbl);
  execute format('grant select,insert on public.%I to service_role',tbl);
  execute format('create policy sign_service on public.%I for all to service_role using(true) with check(true)',tbl);
  execute format('create trigger completion_immutable before update or delete on public.%I for each row execute function public.marketizo_sign_immutable()',tbl);
 end loop;
end $$;

create function public.marketizo_sign_required_fields(rec jsonb, doc jsonb) returns text[]
language plpgsql immutable set search_path=pg_catalog,public as $$
declare fields text[]:=array['name','country'];
begin
 if coalesce(rec->>'role','counterparty')<>'marketizo' then
  fields:=fields||array['address'];
  if rec->>'partyType'='business' then fields:=fields||array['company','taxId']; end if;
  if (doc->'content')::text ~* 'JMBG' then fields:=fields||array['personalId']; end if;
 end if;
 return fields;
end $$;

-- The freeze exception applies only to the new, explicit completion mode.
do $$ declare definition text; old_rule text:=$old$coalesce(trim(e->>'name'),'')='' or coalesce(trim(e->>'email'),'')='' or coalesce(trim(e->>'country'),'')=''$old$;
begin
 definition:=pg_get_functiondef('public.marketizo_sign_command(text,text,uuid,text,jsonb)'::regprocedure);
 if position(old_rule in definition)=0 then raise exception 'Unexpected freeze validation'; end if;
 execute replace(definition,old_rule,$new$coalesce(trim(e->>'email'),'')='' or (coalesce(v_data->>'recipientCompletion','false')<>'true' and (coalesce(trim(e->>'name'),'')='' or coalesce(trim(e->>'country'),'' )=''))$new$);
end $$;

alter function public.marketizo_sign_flow(text,text,jsonb) rename to marketizo_sign_flow_before_completion;
create function public.marketizo_sign_flow(p_organization text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 result jsonb; s public.marketizo_sign_sessions%rowtype; p public.marketizo_sign_parties%rowtype;
 r public.marketizo_sign_requests%rowtype; filled public.marketizo_sign_completed_pdfs%rowtype;
 t timestamptz:=clock_timestamp(); doc jsonb; merged jsonb; saved jsonb; fields text[]; field text; val text;
 entry record; q record; bytes bytea; h text; input_hash text; mode boolean; ready boolean;
begin
 if p_action='prepare' then
  result:=public.marketizo_sign_flow_before_completion(p_organization,p_action,p_data);
  if result->>'ok' is distinct from 'true' then return result; end if;
  select * into r from public.marketizo_sign_requests where id=(result->>'requestId')::uuid and organization_id=p_organization;
  select snapshot into doc from public.marketizo_sign_versions where id=r.version_id;
  if doc->>'recipientCompletion'='true' then
   insert into public.marketizo_sign_completion_requests(request_id) values(r.id) on conflict do nothing;
   for q in select * from public.marketizo_sign_parties where request_id=r.id loop
    fields:=public.marketizo_sign_required_fields(q.recipient,doc);
    if not exists(select 1 from unnest(fields) f where coalesce(trim(q.recipient->>f),'')='') then
     insert into public.marketizo_sign_completed_parties(party_id,request_id,recipient) values(q.id,r.id,q.recipient) on conflict do nothing;
    end if;
   end loop;
  end if;
  return result;
 end if;

 if p_action in ('finalize_data','finalize') then
  select * into r from public.marketizo_sign_requests where id=(p_data->>'requestId')::uuid and organization_id=p_organization;
 elsif p_action in ('link_view','completion_submit','completion_render_data','completion_pdf_store','pdf','link_accept','accept') then
  -- The legacy view checks session, tenant, expiry and closed-request state first.
  result:=public.marketizo_sign_flow_before_completion(p_organization,'link_view',p_data);
  if result->>'ok' is distinct from 'true' then return result; end if;
  select * into s from public.marketizo_sign_sessions where digest=p_data->>'sessionDigest' and expires_at>t;
  select * into p from public.marketizo_sign_parties where id=s.party_id;
  select * into r from public.marketizo_sign_requests where id=p.request_id and organization_id=p_organization;
 else
  return public.marketizo_sign_flow_before_completion(p_organization,p_action,p_data);
 end if;
 mode:=exists(select 1 from public.marketizo_sign_completion_requests where request_id=r.id);
 if not mode then
  if p_action like 'completion_%' then return jsonb_build_object('ok',false,'status',409,'error','Ovaj dokument nema dopunu podataka.'); end if;
  if p_action='link_view' then return result; end if;
  return public.marketizo_sign_flow_before_completion(p_organization,p_action,p_data);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||r.document_id::text,1));
 select * into r from public.marketizo_sign_requests where id=r.id for update;
 select * into filled from public.marketizo_sign_completed_pdfs where request_id=r.id;
 select snapshot into doc from public.marketizo_sign_versions where id=r.version_id;

 if p_action='link_view' then
  select recipient into saved from public.marketizo_sign_completed_parties where party_id=p.id;
  fields:=public.marketizo_sign_required_fields(p.recipient,doc);
  return result||jsonb_build_object('name',coalesce(saved->>'name',p.recipient->>'name'),'pdfSha256',filled.sha256,
   'completion',jsonb_build_object('values',coalesce(saved,p.recipient)-'email','locked',p.recipient-'email',
   'required',to_jsonb(fields),'complete',saved is not null,'ready',filled.request_id is not null,
   'allComplete',not exists(select 1 from public.marketizo_sign_parties x where x.request_id=r.id and not exists(select 1 from public.marketizo_sign_completed_parties y where y.party_id=x.id)),
   'language',coalesce(doc->'contractDetails'->>'language','sr')));
 end if;

 if p_action='completion_submit' then
  if jsonb_typeof(p_data->'fields') is distinct from 'object' then return jsonb_build_object('ok',false,'status',400,'error','Proveri podatke.'); end if;
  merged:=p.recipient;
  for entry in select * from jsonb_each(p_data->'fields') loop
   if entry.key not in ('name','company','address','taxId','registrationId','personalId','capacity','country') or jsonb_typeof(entry.value)<>'string' then return jsonb_build_object('ok',false,'status',400,'error','Nedozvoljeno polje.'); end if;
   val:=trim(entry.value#>>'{}');
   if val ~ '[[:cntrl:]]' or length(val)>(case entry.key when 'name' then 160 when 'company' then 180 when 'address' then 300 when 'capacity' then 120 when 'country' then 2 else 80 end)
    or (entry.key='country' and val !~ '^[A-Z]{2}$') then return jsonb_build_object('ok',false,'status',400,'error','Proveri podatke za ugovor.'); end if;
   if coalesce(trim(p.recipient->>entry.key),'')<>'' and p.recipient->>entry.key is distinct from val then return jsonb_build_object('ok',false,'status',409,'error','Podatak je već uneo pošiljalac.'); end if;
   merged:=jsonb_set(merged,array[entry.key],to_jsonb(val));
  end loop;
  select recipient into saved from public.marketizo_sign_completed_parties where party_id=p.id;
  if saved is not null then
   if saved<>merged then return jsonb_build_object('ok',false,'status',409,'error','Podaci su već potvrđeni.'); end if;
   return jsonb_build_object('ok',true,'duplicate',true);
  end if;
  fields:=public.marketizo_sign_required_fields(p.recipient,doc);
  if exists(select 1 from unnest(fields) f where coalesce(trim(merged->>f),'')='') then return jsonb_build_object('ok',false,'status',400,'error','Popuni sva obavezna polja.'); end if;
  if r.status not in ('queued','open') or filled.request_id is not null or p.accepted_at is not null then return jsonb_build_object('ok',false,'status',409,'error','Podaci su već zaključani.'); end if;
  insert into public.marketizo_sign_completed_parties(party_id,request_id,recipient) values(p.id,r.id,merged);
  perform public.marketizo_sign_log(p_organization,r.document_id,'identity_completed',p.id::text,encode(sha256(convert_to(merged::text,'UTF8')),'hex'),jsonb_build_object('requestId',r.id,'context',s.context));
  return jsonb_build_object('ok',true);
 end if;

 if p_action in ('completion_render_data','completion_pdf_store') then
  if filled.request_id is not null then return jsonb_build_object('ok',true,'ready',true,'pdfSha256',filled.sha256); end if;
  if r.status not in ('queued','open') or exists(select 1 from public.marketizo_sign_parties where request_id=r.id and accepted_at is not null) then return jsonb_build_object('ok',false,'status',409,'error','Verzija se više ne menja.'); end if;
  if exists(select 1 from public.marketizo_sign_parties x where x.request_id=r.id and not exists(select 1 from public.marketizo_sign_completed_parties y where y.party_id=x.id)) then return jsonb_build_object('ok',true,'waiting',true); end if;
  doc:=jsonb_set(doc,'{recipients}',(select jsonb_agg(y.recipient order by a.n) from jsonb_array_elements(doc->'recipients') with ordinality a(rec,n)
   join public.marketizo_sign_parties x on x.request_id=r.id and x.recipient->>'email'=a.rec->>'email' join public.marketizo_sign_completed_parties y on y.party_id=x.id));
  input_hash:=encode(sha256(convert_to(doc::text,'UTF8')),'hex');
  if p_action='completion_render_data' then return jsonb_build_object('ok',true,'document',doc,'issuer',r.issuer,'inputSha256',input_hash); end if;
  if input_hash is distinct from p_data->>'inputSha256' or jsonb_typeof(p_data->'document') is distinct from 'object' then return jsonb_build_object('ok',false,'status',409,'error','Podaci su promenjeni. Ponovo pregledaj ugovor.'); end if;
  bytes:=decode(p_data->>'pdfBase64','base64'); h:=encode(sha256(bytes),'hex');
  if h is distinct from p_data->>'pdfSha256' or octet_length(bytes)>1000000 or substring(bytes from 1 for 5)<>convert_to('%PDF-','UTF8') then return jsonb_build_object('ok',false,'status',400,'error','PDF nije potvrđen.'); end if;
  insert into public.marketizo_sign_completed_pdfs(request_id,document,input_sha256,original_pdf,sha256,renderer) values(r.id,p_data->'document',input_hash,bytes,h,p_data->>'renderer');
  update public.marketizo_sign_sessions set pdf_seen_at=null where party_id in(select id from public.marketizo_sign_parties where request_id=r.id);
  perform public.marketizo_sign_log(p_organization,r.document_id,'completed_pdf_prepared','system',h,jsonb_build_object('reviewedSourceSha256',r.original_sha256,'inputSha256',input_hash));
  return jsonb_build_object('ok',true,'pdfSha256',h,'ready',true);
 end if;

 if filled.request_id is null then return jsonb_build_object('ok',false,'status',409,'error','Prvo dopunite podatke za ugovor.'); end if;
 if p_action='pdf' then
  update public.marketizo_sign_sessions set pdf_seen_at=clock_timestamp() where digest=s.digest;
  perform public.marketizo_sign_log(p_organization,r.document_id,'pdf_accessed',p.id::text,filled.sha256,s.context);
  return jsonb_build_object('ok',true,'pdfBase64',encode(filled.original_pdf,'base64'),'pdfSha256',filled.sha256);
 end if;
 if p_action='accept' then return jsonb_build_object('ok',false,'status',409,'error','Otvori trenutni link za potpis.'); end if;
 if p_action='link_accept' then
  select * into p from public.marketizo_sign_parties where id=p.id for update;
  select recipient into saved from public.marketizo_sign_completed_parties where party_id=p.id;
  if p.accepted_at is not null then
   if p.accepted_command=(p_data->>'commandId')::uuid and p.accepted_payload_sha256=p_data->>'payloadSha256' then return jsonb_build_object('ok',true,'requestId',r.id,'duplicate',true); end if;
   return jsonb_build_object('ok',false,'status',409,'error','Potpis je već zabeležen.');
  end if;
  if r.expires_at<=t or r.status not in ('queued','open') or s.pdf_seen_at is null or s.pdf_seen_at<filled.created_at
   or filled.sha256 is distinct from p_data->>'pdfSha256' or coalesce(p_data->>'accepted','')<>'true' or coalesce(p_data->>'authority','')<>'true'
   or lower(trim(coalesce(p_data->'signature'->>'name','')))<>lower(trim(saved->>'name')) or coalesce(length(p_data->>'consentText'),0)<30 then return jsonb_build_object('ok',false,'status',400,'error','Pregledaj popunjen ugovor i potvrdi potpisivanje.'); end if;
  update public.marketizo_sign_parties set accepted_at=t,accepted_command=(p_data->>'commandId')::uuid,accepted_payload_sha256=p_data->>'payloadSha256',consent_text=p_data->>'consentText',
   signature=(p_data->'signature')||jsonb_build_object('context',s.context,'authentication',jsonb_build_object('method','email_link','at',s.context->'authenticatedAt','identityVerified',false)) where id=p.id;
  perform public.marketizo_sign_log(p_organization,r.document_id,'ses_accepted',p.id::text,filled.sha256,jsonb_build_object('name',saved->>'name','consentVersion','ses-2','context',s.context));
  if not exists(select 1 from public.marketizo_sign_parties where request_id=r.id and accepted_at is null) then
   update public.marketizo_sign_requests set status='finalizing' where id=r.id;
   insert into public.marketizo_sign_outbox(request_id,kind,expires_at) values(r.id,'finalize',t+interval '7 days') on conflict do nothing;
  end if;
  update public.marketizo_sign_documents set status='signing',revision=revision+1,updated_at=t where id=r.document_id;
  return jsonb_build_object('ok',true,'requestId',r.id);
 end if;
 if p_action='finalize_data' then
  result:=public.marketizo_sign_flow_before_completion(p_organization,p_action,p_data);
  if result->>'ok' is distinct from 'true' then return result; end if;
  return result||jsonb_build_object('originalBase64',encode(filled.original_pdf,'base64'),'originalSha256',filled.sha256,
   'personalization',jsonb_build_object('reviewedSourceSha256',r.original_sha256,'inputSha256',filled.input_sha256,'completedAt',filled.created_at));
 end if;
 if p_action='finalize' then
  if r.status not in ('finalizing','signed') or exists(select 1 from public.marketizo_sign_parties where request_id=r.id and accepted_at is null) then return jsonb_build_object('ok',false,'status',409,'error','Nisu potvrđeni svi potpisi.'); end if;
  bytes:=decode(p_data->>'pdfBase64','base64');h:=encode(sha256(bytes),'hex');
  if substring(bytes from 1 for octet_length(filled.original_pdf))<>filled.original_pdf or h is distinct from p_data->>'pdfSha256' or octet_length(bytes)>1500000
   or p_data->'manifest'->>'originalSha256' is distinct from filled.sha256 then return jsonb_build_object('ok',false,'status',400,'error','Završni PDF nije potvrđen.'); end if;
  if exists(select 1 from public.marketizo_sign_receipts where request_id=r.id) then return jsonb_build_object('ok',true,'duplicate',true); end if;
  insert into public.marketizo_sign_receipts(request_id,final_pdf,final_sha256,manifest,manifest_sha256,seal) values(r.id,bytes,h,p_data->'manifest',p_data->>'manifestSha256',p_data->>'seal');
  update public.marketizo_sign_requests set status='signed' where id=r.id;
  update public.marketizo_sign_documents set status='signed',revision=revision+1,updated_at=t where id=r.document_id;
  perform public.marketizo_sign_log(p_organization,r.document_id,'completed','system',h,jsonb_build_object('originalSha256',filled.sha256,'manifestSha256',p_data->>'manifestSha256'));
  return jsonb_build_object('ok',true,'finalSha256',h);
 end if;
 return jsonb_build_object('ok',false,'status',400,'error','Nepoznata radnja.');
end $$;
revoke all on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_completion(text,text,jsonb),public.marketizo_sign_required_fields(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_completion(text,text,jsonb),public.marketizo_sign_required_fields(jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
