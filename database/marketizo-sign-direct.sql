-- Additive direct-link signing and durable final-PDF email delivery.
-- Existing agreements, acceptance records and receipts are never rewritten.
begin;
alter table public.marketizo_sign_outbox drop constraint marketizo_sign_outbox_kind_check;
alter table public.marketizo_sign_outbox add constraint marketizo_sign_outbox_kind_check check(kind in ('invitation','otp','finalize','signed_pdf'));
create unique index marketizo_sign_one_receipt_mail on public.marketizo_sign_outbox(request_id,party_id) where kind='signed_pdf';
alter function public.marketizo_sign_flow(text,text,jsonb) rename to marketizo_sign_flow_otp;
create function public.marketizo_sign_flow(p_organization text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare result jsonb; s public.marketizo_sign_sessions%rowtype; p public.marketizo_sign_parties%rowtype;
 r public.marketizo_sign_requests%rowtype; receipt public.marketizo_sign_receipts%rowtype;
 t timestamptz:=clock_timestamp(); item jsonb; verified timestamptz;
begin
 if p_action='link_exchange' then
  result:=public.marketizo_sign_flow_otp(p_organization,'exchange',p_data);
  if result->>'ok'<>'true' then return result; end if;
  -- Only the existing high-entropy invitation exchange can create this cookie.
  -- Possession of that link is access authorization, not verified identity.
  return public.marketizo_sign_flow(p_organization,'link_view',p_data);
 end if;
 if p_action='link_view' then
  result:=public.marketizo_sign_flow_otp(p_organization,'view',p_data);
  if result->>'ok'<>'true' then return result; end if;
  select * into s from public.marketizo_sign_sessions where digest=p_data->>'sessionDigest' and expires_at>t;
  select * into p from public.marketizo_sign_parties where id=s.party_id;
  select * into r from public.marketizo_sign_requests where id=p.request_id and organization_id=p_organization;
  if coalesce(s.context->>'authenticationMethod','')<>'email_link' then
   update public.marketizo_sign_sessions set verified_at=t,
    context=context||jsonb_build_object('authenticationMethod','email_link','authenticatedAt',t)
    where digest=s.digest;
   perform public.marketizo_sign_log(p_organization,r.document_id,'email_link_accessed',p.id::text,r.original_sha256,
    s.context||jsonb_build_object('authenticationMethod','email_link','authenticatedAt',t));
  end if;
  result:=public.marketizo_sign_flow_otp(p_organization,'view',p_data);
  return result||jsonb_build_object('authenticationMethod','email_link');
 end if;
 if p_action='link_accept' then
  select * into s from public.marketizo_sign_sessions where digest=p_data->>'sessionDigest' and expires_at>t;
  select * into p from public.marketizo_sign_parties where id=s.party_id;
  select * into r from public.marketizo_sign_requests where id=p.request_id and organization_id=p_organization;
  if r.id is null or s.verified_at is null or coalesce(s.context->>'authenticationMethod','')<>'email_link' then
   return jsonb_build_object('ok',false,'status',401,'error','Ponovo otvori link iz mejla.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||r.document_id::text,1));
  select * into r from public.marketizo_sign_requests where id=r.id for update;
  select * into p from public.marketizo_sign_parties where id=p.id for update;
  if p.accepted_at is not null then
   if p.accepted_command=(p_data->>'commandId')::uuid and p.accepted_payload_sha256=p_data->>'payloadSha256' then
    return jsonb_build_object('ok',true,'requestId',r.id,'duplicate',true);
   end if;
   return jsonb_build_object('ok',false,'status',409,'error','Potpis je već zabeležen.');
  end if;
  if r.expires_at<=t or r.status not in ('queued','open') or s.pdf_seen_at is null
   or r.original_sha256 is distinct from p_data->>'pdfSha256'
   or coalesce(p_data->>'accepted','')<>'true' or coalesce(p_data->>'authority','')<>'true'
   or lower(trim(coalesce(p_data->'signature'->>'name','')))<>lower(trim(p.recipient->>'name'))
   or coalesce(length(p_data->>'consentText'),0)<30 then
   return jsonb_build_object('ok',false,'status',400,'error','Sačekaj prikaz dokumenta, upiši ime i potvrdi potpisivanje.');
  end if;
  update public.marketizo_sign_parties set accepted_at=t,accepted_command=(p_data->>'commandId')::uuid,
   accepted_payload_sha256=p_data->>'payloadSha256',consent_text=p_data->>'consentText',
   signature=(p_data->'signature')||jsonb_build_object('context',s.context,
    'authentication',jsonb_build_object('method','email_link','at',s.context->'authenticatedAt','identityVerified',false))
   where id=p.id;
  perform public.marketizo_sign_log(p_organization,r.document_id,'ses_accepted',p.id::text,r.original_sha256,
   jsonb_build_object('name',p_data->'signature'->>'name','consentVersion','ses-2','context',s.context));
  if not exists(select 1 from public.marketizo_sign_parties where request_id=r.id and accepted_at is null) then
   update public.marketizo_sign_requests set status='finalizing' where id=r.id;
   insert into public.marketizo_sign_outbox(request_id,kind,expires_at) values(r.id,'finalize',t+interval '7 days') on conflict do nothing;
  end if;
  update public.marketizo_sign_documents set status='signing',revision=revision+1,updated_at=t where id=r.document_id;
  return jsonb_build_object('ok',true,'requestId',r.id);
 end if;
 if p_action='queue_receipts' then
  select * into r from public.marketizo_sign_requests where id=(p_data->>'requestId')::uuid and organization_id=p_organization;
  if r.status is distinct from 'signed' or not exists(select 1 from public.marketizo_sign_receipts where request_id=r.id) then
   return jsonb_build_object('ok',false,'status',409,'error','Završni PDF još nije sačuvan.');
  end if;
  if jsonb_array_length(p_data->'messages') is distinct from (select count(*)::integer from public.marketizo_sign_parties where request_id=r.id) then
   return jsonb_build_object('ok',false,'status',400,'error','Proveri primaoce završnog dokumenta.');
  end if;
  for item in select value from jsonb_array_elements(p_data->'messages') loop
   if not exists(select 1 from public.marketizo_sign_parties where request_id=r.id and id=(item->>'partyId')::uuid and recipient->>'email'=item->>'to') then
    raise exception 'Receipt recipient mismatch';
   end if;
   insert into public.marketizo_sign_outbox(request_id,party_id,kind,sealed_payload,expires_at)
    values(r.id,(item->>'partyId')::uuid,'signed_pdf',item->>'sealedMail',t+interval '7 days') on conflict do nothing;
  end loop;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='receipt_mail_data' then
  select * into r from public.marketizo_sign_requests where id=(p_data->>'requestId')::uuid and organization_id=p_organization;
  select * into p from public.marketizo_sign_parties where id=(p_data->>'partyId')::uuid and request_id=r.id;
  select * into receipt from public.marketizo_sign_receipts where request_id=r.id;
  if p.id is null or receipt.request_id is null then return jsonb_build_object('ok',false,'status',404,'error','Dokument nije spreman.'); end if;
  return jsonb_build_object('ok',true,'to',p.recipient->>'email','pdfBase64',encode(receipt.final_pdf,'base64'),'pdfSha256',receipt.final_sha256);
 end if;
 result:=public.marketizo_sign_flow_otp(p_organization,p_action,p_data);
 if p_action='finalize_data' and result->>'ok'='true' then
  return result||jsonb_build_object('signers',(select jsonb_agg(jsonb_build_object('id',x.id,'name',x.signature->>'name',
   'email',x.recipient->>'email','acceptedAt',x.accepted_at,'consentText',x.consent_text,'strokes',x.signature->'strokes',
   'context',x.signature->'context','authentication',coalesce(x.signature->'authentication',
    jsonb_build_object('method','email_otp','at',x.signature->'otpVerifiedAt','identityVerified',false))) order by x.id)
   from public.marketizo_sign_parties x where x.request_id=(p_data->>'requestId')::uuid));
 end if;
 return result;
end; $$;
revoke all on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_otp(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_otp(text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
