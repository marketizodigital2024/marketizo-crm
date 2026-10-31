-- Public onboarding uses the canonical server template only. Ordinary signing remains unchanged.
begin;
alter function public.marketizo_sign_flow(text,text,jsonb) rename to marketizo_sign_flow_before_public_onboarding;
create function public.marketizo_sign_flow(p_organization text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare result jsonb; previous public.marketizo_sign_requests%rowtype; doc jsonb; rec jsonb; bytes bytea; digest text;
 doc_id uuid; request_id uuid; version_id uuid; party_id uuid; t timestamptz:=clock_timestamp();
begin
 if p_action<>'public_onboarding_start' then
  result:=public.marketizo_sign_flow_before_public_onboarding(p_organization,p_action,p_data);
  if p_action in ('completion_submit','link_accept') and result->>'ok'='true' then
   -- Search projections may change; signed snapshots, PDFs and recipient evidence never do.
   update public.marketizo_sign_documents d set
    recipient_names=c.recipient->>'name',recipient_emails=coalesce(m.email,''),
    search_text=d.title||' '||coalesce(c.recipient->>'name','')||' '||coalesce(c.recipient->>'company','')||' '||coalesce(m.email,'')
   from public.marketizo_sign_requests r join public.marketizo_sign_parties p on p.request_id=r.id
   join public.marketizo_sign_completed_parties c on c.party_id=p.id
   join public.marketizo_sign_sessions s on s.party_id=p.id
   left join public.marketizo_sign_receipt_contacts m on m.party_id=p.id
   where d.id=r.document_id and r.organization_id=p_organization and r.created_by='public-onboarding' and s.digest=p_data->>'sessionDigest';
  end if;
  return result;
 end if;
 if p_organization<>'marketizo-main' then return jsonb_build_object('ok',false,'status',403,'error','Nedozvoljen obrazac.'); end if;
 doc:=p_data->'document';
 if doc->>'note' is distinct from 'marketizo-onboarding:v3' or doc->>'category' is distinct from 'clients'
  or doc->>'recipientCompletion' is distinct from 'true' or doc->>'signatureMethod' is distinct from 'ses'
  or jsonb_typeof(doc->'recipients') is distinct from 'array' or jsonb_array_length(doc->'recipients')<>1
  or jsonb_typeof(doc->'content'->'blocks') is distinct from 'array' or octet_length(doc::text)>100000
  or coalesce(length(p_data->'issuer'->>'name'),0)<2 or coalesce(p_data->>'requestSha256','')!~'^[a-f0-9]{64}$' or coalesce(p_data->>'tokenSha256','')!~'^[a-f0-9]{64}$' then
  return jsonb_build_object('ok',false,'status',400,'error','Proveri onboarding šablon.');
 end if;
 rec:=doc->'recipients'->0;
 if coalesce(rec->>'name','')<>'' or coalesce(rec->>'email','')<>'' or coalesce(rec->>'company','')<>'' or coalesce(rec->>'country','')<>'' or rec->>'role' is distinct from 'counterparty' then
  return jsonb_build_object('ok',false,'status',400,'error','Podatke unosi klijent kroz svoj obrazac.');
 end if;
 perform pg_advisory_xact_lock(hashtextextended('public-onboarding:'||p_organization||':'||(p_data->>'commandId'),4));
 select * into previous from public.marketizo_sign_requests where organization_id=p_organization and command_id=(p_data->>'commandId')::uuid;
 if found then
  if previous.created_by<>'public-onboarding' or previous.request_sha256<>p_data->>'requestSha256' or not exists(select 1 from public.marketizo_sign_parties x where x.request_id=previous.id and x.invitation_sha256=p_data->>'tokenSha256') then
   return jsonb_build_object('ok',false,'status',409,'error','Ponovo učitaj pravila pre nastavka.');
  end if;
  return jsonb_build_object('ok',true,'requestId',previous.id,'documentId',previous.document_id,'duplicate',true);
 end if;
 bytes:=decode(p_data->>'pdfBase64','base64');digest:=encode(sha256(bytes),'hex');
 if digest is distinct from p_data->>'pdfSha256' or octet_length(bytes)>1000000 or substring(bytes from 1 for 5)<>convert_to('%PDF-','UTF8') then
  return jsonb_build_object('ok',false,'status',400,'error','PDF nije potvrđen.');
 end if;
 doc_id:=gen_random_uuid();request_id:=gen_random_uuid();party_id:=gen_random_uuid();
 insert into public.marketizo_sign_documents(id,organization_id,data,title,category,status,revision,created_by,search_text)
 values(doc_id,p_organization,doc,doc->>'title','clients','sent',3,'public-onboarding',doc->>'title');
 insert into public.marketizo_sign_versions(organization_id,document_id,document_revision,snapshot,content_sha256,frozen_by)
 values(p_organization,doc_id,1,doc,encode(sha256(convert_to(doc::text,'UTF8')),'hex'),'public-onboarding') returning id into version_id;
 insert into public.marketizo_sign_prepared_pdfs(version_id,original_pdf,sha256,renderer,created_by)
 values(version_id,bytes,digest,p_data->>'renderer','public-onboarding');
 insert into public.marketizo_sign_requests(id,organization_id,document_id,version_id,command_id,request_sha256,original_pdf,original_sha256,legal_review,issuer,created_by,status,expires_at)
 values(request_id,p_organization,doc_id,version_id,(p_data->>'commandId')::uuid,p_data->>'requestSha256',bytes,digest,
  jsonb_build_object('decision','ses_allowed','reviewedBy','Marketizo Digital — onboarding šablon','reference','Zajednički onboarding obrazac omogućen prema zahtevu vlasnika aplikacije.','pdfSha256',digest,'pdfReviewed',true),
  p_data->'issuer','public-onboarding','open',t+interval '7 days');
 insert into public.marketizo_sign_parties(id,request_id,recipient,invitation_sha256) values(party_id,request_id,rec,p_data->>'tokenSha256');
 insert into public.marketizo_sign_completion_requests(request_id) values(request_id);
 perform public.marketizo_sign_log(p_organization,doc_id,'public_onboarding_created','public-onboarding',digest,jsonb_build_object('requestId',request_id,'context',p_data->'context','templateSha256',p_data->>'templateSha256'));
 return jsonb_build_object('ok',true,'requestId',request_id,'documentId',doc_id);
end $$;
revoke all on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_public_onboarding(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_public_onboarding(text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
