-- Run AFTER marketizo-sign.sql in an isolated test environment first.
-- SES evidence is distinct from qualified signatures and timestamps.
begin;
create table public.marketizo_sign_prepared_pdfs (
 version_id uuid primary key references public.marketizo_sign_versions(id), original_pdf bytea not null check(octet_length(original_pdf)<=1000000),
 sha256 text not null, renderer text not null, created_by text not null, created_at timestamptz not null default clock_timestamp()
);
create trigger marketizo_sign_prepared_pdfs_immutable before update or delete on public.marketizo_sign_prepared_pdfs for each row execute function public.marketizo_sign_immutable();
create table public.marketizo_sign_requests (
 id uuid primary key, organization_id text not null, document_id uuid not null unique references public.marketizo_sign_documents(id),
 version_id uuid not null references public.marketizo_sign_versions(id), command_id uuid not null,
 request_sha256 text not null, original_pdf bytea not null check(octet_length(original_pdf)<=1000000), original_sha256 text not null,
 legal_review jsonb not null, issuer jsonb not null, created_by text not null,
 status text not null default 'queued' check(status in ('queued','open','finalizing','signed','voided','expired','declined')),
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 unique(organization_id,command_id)
);
create table public.marketizo_sign_parties (
 id uuid primary key, request_id uuid not null references public.marketizo_sign_requests(id), recipient jsonb not null,
 invitation_sha256 text not null unique, last_otp_at timestamptz, otp_count integer not null default 0, otp_window timestamptz,
 challenge_id uuid, otp_sha256 text, otp_session text, otp_expires_at timestamptz, otp_attempts integer not null default 0,
 accepted_at timestamptz, accepted_command uuid, accepted_payload_sha256 text, signature jsonb, consent_text text
);
create unique index marketizo_sign_party_email on public.marketizo_sign_parties(request_id,(recipient->>'email'));
create table public.marketizo_sign_sessions (
 digest text primary key, party_id uuid not null references public.marketizo_sign_parties(id),
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 verified_at timestamptz, pdf_seen_at timestamptz, context jsonb not null default '{}'
);
create table public.marketizo_sign_outbox (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.marketizo_sign_requests(id), party_id uuid,
 kind text not null check(kind in ('invitation','otp','finalize')), sealed_payload text,
 state text not null default 'queued' check(state in ('queued','leased','done','failed','cancelled')),
 attempts integer not null default 0, lease_id uuid, lease_until timestamptz,
 next_attempt_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp()
);
create unique index marketizo_sign_one_finalizer on public.marketizo_sign_outbox(request_id) where kind='finalize';
create index marketizo_sign_outbox_due on public.marketizo_sign_outbox(state,next_attempt_at);
create table public.marketizo_sign_receipts (
 request_id uuid primary key references public.marketizo_sign_requests(id), final_pdf bytea not null check(octet_length(final_pdf)<=1500000),
 final_sha256 text not null, manifest jsonb not null, manifest_sha256 text not null, seal text not null,
 created_at timestamptz not null default clock_timestamp()
);
create table public.marketizo_sign_rates (key text not null, window_start timestamptz not null, hits integer not null, primary key(key,window_start));
alter table public.marketizo_sign_events add column context jsonb not null default '{}';
create trigger marketizo_sign_receipts_immutable before update or delete on public.marketizo_sign_receipts for each row execute function public.marketizo_sign_immutable();
create function public.marketizo_sign_request_guard() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if tg_op='DELETE' then raise exception 'Sign requests cannot be deleted by the application'; end if;
 if (new.id,new.organization_id,new.document_id,new.version_id,new.original_pdf,new.original_sha256,new.legal_review,new.issuer,new.expires_at,new.created_by,new.created_at,new.command_id,new.request_sha256)
   is distinct from (old.id,old.organization_id,old.document_id,old.version_id,old.original_pdf,old.original_sha256,old.legal_review,old.issuer,old.expires_at,old.created_by,old.created_at,old.command_id,old.request_sha256) then raise exception 'Sign request identity is immutable'; end if;
 return new;
end; $$;
create trigger marketizo_sign_request_guard before update or delete on public.marketizo_sign_requests for each row execute function public.marketizo_sign_request_guard();
create function public.marketizo_sign_party_guard() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if tg_op='DELETE' then raise exception 'Sign parties cannot be deleted by the application'; end if;
 if (new.id,new.request_id,new.recipient,new.invitation_sha256) is distinct from (old.id,old.request_id,old.recipient,old.invitation_sha256)
  or (old.accepted_at is not null and (new.accepted_at,new.accepted_command,new.accepted_payload_sha256,new.signature,new.consent_text) is distinct from (old.accepted_at,old.accepted_command,old.accepted_payload_sha256,old.signature,old.consent_text)) then raise exception 'Sign identity or acceptance is immutable'; end if;
 return new;
end; $$;
create trigger marketizo_sign_party_guard before update or delete on public.marketizo_sign_parties for each row execute function public.marketizo_sign_party_guard();

create function public.marketizo_sign_log(p_org text,p_doc uuid,p_action text,p_actor text,p_hash text,p_context jsonb)
returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare n integer; prev text; t timestamptz:=clock_timestamp(); h text;
begin
 perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||p_doc::text,1));
 select coalesce(max(sequence),0)+1 into n from public.marketizo_sign_events where organization_id=p_org and document_id=p_doc;
 select event_sha256 into prev from public.marketizo_sign_events where organization_id=p_org and document_id=p_doc order by sequence desc limit 1;
 prev:=coalesce(prev,repeat('0',64));
 h:=encode(sha256(convert_to(jsonb_build_object('organization',p_org,'document',p_doc,'sequence',n,'action',p_action,'actor',p_actor,'at',t,'content_sha256',p_hash,'previous_sha256',prev,'context',p_context)::text,'UTF8')),'hex');
 insert into public.marketizo_sign_events values(p_org,p_doc,n,p_action,p_actor,t,p_hash,prev,h,p_context);
end; $$;

create function public.marketizo_sign_flow(p_organization text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.marketizo_sign_requests%rowtype; p public.marketizo_sign_parties%rowtype;
 s public.marketizo_sign_sessions%rowtype; d public.marketizo_sign_documents%rowtype; v public.marketizo_sign_versions%rowtype;
 j public.marketizo_sign_outbox%rowtype; receipt public.marketizo_sign_receipts%rowtype; prepared public.marketizo_sign_prepared_pdfs%rowtype;
 t timestamptz:=clock_timestamp(); actor text:=p_data->>'actor'; req_id uuid; item jsonb; n integer; bytes bytea; h text;
begin
 if p_action='rate' then
  insert into public.marketizo_sign_rates values(p_data->>'key',date_trunc('minute',t),1)
   on conflict(key,window_start) do update set hits=marketizo_sign_rates.hits+1 returning hits into n;
  return jsonb_build_object('ok',n<=60,'status',429,'error','Previše zahteva. Pokušaj za minut.');
 end if;
 if p_action in ('prepare','void','pdf_store') then
  if actor is null or actor not in ('emp-miljan','emp-ivana') or not exists(
   select 1 from public.agency_crm_state c,lateral jsonb_array_elements(coalesce(c.payload->'employees','[]')) e
   where c.id=p_organization and e->>'id'=actor and coalesce(e->>'active','true')<>'false' and coalesce(e->>'status','')<>'Neaktivan'
  ) then return jsonb_build_object('ok',false,'status',403,'error','Nemaš dozvolu za slanje.'); end if;
 end if;
 if p_action='pdf_store' then
  perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||(p_data->>'documentId'),1));
  select * into d from public.marketizo_sign_documents where id=(p_data->>'documentId')::uuid and organization_id=p_organization;
  if d.id is null or d.status<>'ready' or d.revision<>(p_data->>'revision')::integer then return jsonb_build_object('ok',false,'status',409,'error','Prvo sačuvaj i zaključaj poslednju verziju.'); end if;
  select * into v from public.marketizo_sign_versions where document_id=d.id order by document_revision desc limit 1;
  select * into prepared from public.marketizo_sign_prepared_pdfs where version_id=v.id;
  if prepared.version_id is null then
   bytes:=decode(p_data->>'pdfBase64','base64');h:=encode(sha256(bytes),'hex');
   if h is distinct from p_data->>'pdfSha256' or octet_length(bytes)>1000000 or substring(bytes from 1 for 5)<>convert_to('%PDF-','UTF8') then return jsonb_build_object('ok',false,'status',400,'error','PDF nije potvrđen.'); end if;
   insert into public.marketizo_sign_prepared_pdfs(version_id,original_pdf,sha256,renderer,created_by) values(v.id,bytes,h,p_data->>'renderer',actor);
   select * into prepared from public.marketizo_sign_prepared_pdfs where version_id=v.id;
   perform public.marketizo_sign_log(p_organization,d.id,'pdf_prepared',actor,h,jsonb_build_object('versionId',v.id));
  end if;
  return jsonb_build_object('ok',true,'pdfBase64',encode(prepared.original_pdf,'base64'),'pdfSha256',prepared.sha256);
 end if;
 if p_action='prepare' then
  perform pg_advisory_xact_lock(hashtextextended('marketizo-sign-command:'||(p_data->>'commandId'),2));
  select * into r from public.marketizo_sign_requests where organization_id=p_organization and command_id=(p_data->>'commandId')::uuid;
  if found then
   if r.request_sha256<>p_data->>'requestSha256' then return jsonb_build_object('ok',false,'status',409,'error','Pokušaj je već upotrebljen za drugu izmenu.'); end if;
   return jsonb_build_object('ok',true,'requestId',r.id,'duplicate',true);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||(p_data->>'documentId'),1));
  select * into d from public.marketizo_sign_documents where id=(p_data->>'documentId')::uuid and organization_id=p_organization for update;
  if d.id is null or d.status<>'ready' or d.archived_at is not null or d.revision<>(p_data->>'revision')::integer then return jsonb_build_object('ok',false,'status',409,'error','Učitaj poslednju zaključanu verziju.'); end if;
  if coalesce(d.data->>'signatureMethod','')<>'ses' or coalesce(p_data->'review'->>'decision','')<>'ses_allowed'
   or coalesce(length(trim(p_data->'review'->>'reviewedBy')),0)<3 or coalesce(length(trim(p_data->'review'->>'reference')),0)<5
   or coalesce(length(p_data->'issuer'->>'name'),0)<2 then return jsonb_build_object('ok',false,'status',400,'error','Potrebna je dokumentovana provera dozvoljene forme ugovora.'); end if;
  select * into v from public.marketizo_sign_versions where document_id=d.id order by document_revision desc limit 1;
  if v.snapshot<>d.data then return jsonb_build_object('ok',false,'status',409,'error','Zaključana verzija ne odgovara dokumentu.'); end if;
  if exists(select 1 from public.marketizo_sign_requests where document_id=d.id) then return jsonb_build_object('ok',false,'status',409,'error','Za ovaj dokument već postoji zahtev.'); end if;
  select * into prepared from public.marketizo_sign_prepared_pdfs where version_id=v.id;
  if prepared.version_id is null or prepared.sha256 is distinct from p_data->'review'->>'pdfSha256' or coalesce(p_data->'review'->>'pdfReviewed','')<>'true' then return jsonb_build_object('ok',false,'status',400,'error','Pregledaj i potvrdi tačan pripremljeni PDF pre slanja.'); end if;
  bytes:=prepared.original_pdf;h:=prepared.sha256;
  if jsonb_array_length(p_data->'parties')<>jsonb_array_length(v.snapshot->'recipients') or jsonb_array_length(p_data->'parties')=0 then return jsonb_build_object('ok',false,'status',400,'error','Proveri sve obavezne potpisnike.'); end if;
  req_id:=(p_data->>'id')::uuid;
  insert into public.marketizo_sign_requests(id,organization_id,document_id,version_id,command_id,request_sha256,original_pdf,original_sha256,legal_review,issuer,created_by,expires_at)
   values(req_id,p_organization,d.id,v.id,(p_data->>'commandId')::uuid,p_data->>'requestSha256',bytes,h,p_data->'review',p_data->'issuer',actor,t+interval '7 days');
  for item in select value from jsonb_array_elements(p_data->'parties') loop
   if not exists(select 1 from jsonb_array_elements(v.snapshot->'recipients') rec where rec=item->'recipient') or (item->>'tokenSha256')!~'^[a-f0-9]{64}$' then raise exception 'Recipient mismatch'; end if;
   insert into public.marketizo_sign_parties(id,request_id,recipient,invitation_sha256) values((item->>'id')::uuid,req_id,item->'recipient',item->>'tokenSha256');
   insert into public.marketizo_sign_outbox(request_id,party_id,kind,sealed_payload,expires_at) values(req_id,(item->>'id')::uuid,'invitation',item->>'sealedMail',t+interval '7 days');
  end loop;
  perform public.marketizo_sign_log(p_organization,d.id,'invitation_queued',actor,h,jsonb_build_object('requestId',req_id,'method','ses','review',p_data->'review','renderer',p_data->>'renderer'));
  return jsonb_build_object('ok',true,'requestId',req_id,'pdfSha256',h);
 end if;

 if p_action='claim' then
  update public.marketizo_sign_outbox set state='failed',sealed_payload=null where state in ('queued','leased') and expires_at<=t;
  select o.* into j from public.marketizo_sign_outbox o join public.marketizo_sign_requests q on q.id=o.request_id
   where q.organization_id=p_organization and q.status not in ('voided','expired','declined')
    and (o.state='queued' or (o.state='leased' and o.lease_until<t)) and o.next_attempt_at<=t and o.expires_at>t
   order by o.created_at for update of o skip locked limit 1;
  if j.id is null then return jsonb_build_object('ok',true,'job',null); end if;
  update public.marketizo_sign_outbox set state='leased',lease_id=(p_data->>'lease')::uuid,lease_until=t+interval '2 minutes',attempts=attempts+1 where id=j.id;
  return jsonb_build_object('ok',true,'job',to_jsonb(j)||jsonb_build_object('lease_id',p_data->>'lease'));
 end if;
 if p_action='ack' then
  select * into j from public.marketizo_sign_outbox where id=(p_data->>'jobId')::uuid and state='leased' and lease_id=(p_data->>'lease')::uuid;
  if j.id is null then return jsonb_build_object('ok',false,'status',409,'error','Posao više nije rezervisan.'); end if;
  select * into r from public.marketizo_sign_requests where id=j.request_id and organization_id=p_organization;
  if r.id is null then return jsonb_build_object('ok',false,'status',404,'error','Zahtev nije pronađen.'); end if;
  perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||r.document_id::text,1));
  select * into j from public.marketizo_sign_outbox where id=j.id and state='leased' and lease_id=(p_data->>'lease')::uuid for update;
  if j.id is null then return jsonb_build_object('ok',false,'status',409,'error','Posao više nije rezervisan.'); end if;
  if r.status in ('voided','declined','expired') then update public.marketizo_sign_outbox set state='cancelled',sealed_payload=null where id=j.id;
  elsif p_data->>'success'='true' then
   update public.marketizo_sign_outbox set state='done',sealed_payload=null,lease_id=null,lease_until=null where id=j.id;
   if j.kind='invitation' then
    perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||r.document_id::text,1));
    update public.marketizo_sign_requests set status='open' where id=r.id and status='queued';
    update public.marketizo_sign_documents set status='sent',revision=revision+1,updated_at=t where id=r.document_id and status='ready';
   end if;
   if j.kind<>'finalize' then perform public.marketizo_sign_log(p_organization,r.document_id,'mail_accepted',coalesce(j.party_id::text,'system'),r.original_sha256,jsonb_build_object('kind',j.kind,'job',j.id)); end if;
  else
   update public.marketizo_sign_outbox set state=case when attempts>=8 then 'failed' else 'queued' end,
    sealed_payload=case when attempts>=8 then null else sealed_payload end,lease_id=null,lease_until=null,next_attempt_at=t+(least(3600,power(2,attempts)::integer*15)*interval '1 second') where id=j.id;
  end if;
  return jsonb_build_object('ok',true);
 end if;
 if p_action in ('finalize_data','finalize','void') then
  select * into r from public.marketizo_sign_requests where id=(p_data->>'requestId')::uuid and organization_id=p_organization;
 else
  if p_action='exchange' then
   select * into p from public.marketizo_sign_parties where invitation_sha256=p_data->>'invitationDigest';
  else
   select * into s from public.marketizo_sign_sessions where digest=p_data->>'sessionDigest' and expires_at>t;
   select * into p from public.marketizo_sign_parties where id=s.party_id;
  end if;
  select * into r from public.marketizo_sign_requests where id=p.request_id and organization_id=p_organization;
 end if;
 if r.id is null then return jsonb_build_object('ok',false,'status',401,'error','Pristup nije važeći ili je istekao.'); end if;
 perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||r.document_id::text,1));
 select * into r from public.marketizo_sign_requests where id=r.id for update;
 if p_action='void' then
  if r.status in ('signed','finalizing') then return jsonb_build_object('ok',false,'status',409,'error','Prihvaćen dokument se ne poništava ovim putem.'); end if;
  update public.marketizo_sign_requests set status='voided' where id=r.id;
  update public.marketizo_sign_documents set status='voided',revision=revision+1,updated_at=t where id=r.document_id;
  update public.marketizo_sign_outbox set state='cancelled',sealed_payload=null where request_id=r.id and state<>'done';
  perform public.marketizo_sign_log(p_organization,r.document_id,'voided',actor,r.original_sha256,'{}'); return jsonb_build_object('ok',true);
 end if;
 if p_action in ('finalize_data','finalize') then
  if r.status not in ('finalizing','signed') or exists(select 1 from public.marketizo_sign_parties where request_id=r.id and accepted_at is null) then return jsonb_build_object('ok',false,'status',409,'error','Nisu potvrđeni svi obavezni potpisi.'); end if;
  if p_action='finalize_data' then
   select snapshot into item from public.marketizo_sign_versions where id=r.version_id;
   return jsonb_build_object('ok',true,'requestId',r.id,'documentId',r.document_id,'title',item->>'title','originalBase64',encode(r.original_pdf,'base64'),'originalSha256',r.original_sha256,'issuer',r.issuer,'review',r.legal_review,
    'signers',(select jsonb_agg(jsonb_build_object('name',x.signature->>'name','email',x.recipient->>'email','acceptedAt',x.accepted_at,'consentText',x.consent_text,'strokes',x.signature->'strokes','context',x.signature->'context') order by x.id) from public.marketizo_sign_parties x where x.request_id=r.id),
    'events',(select jsonb_agg(to_jsonb(e) order by e.sequence) from public.marketizo_sign_events e where e.document_id=r.document_id and e.organization_id=p_organization));
  end if;
  bytes:=decode(p_data->>'pdfBase64','base64'); h:=encode(sha256(bytes),'hex');
  if substring(bytes from 1 for octet_length(r.original_pdf))<>r.original_pdf or h<>p_data->>'pdfSha256' or octet_length(bytes)>1500000
   or p_data->'manifest'->>'originalSha256'<>r.original_sha256 then return jsonb_build_object('ok',false,'status',400,'error','Dokazni PDF nije potvrđen.'); end if;
  select * into receipt from public.marketizo_sign_receipts where request_id=r.id;
  if receipt.request_id is not null then return jsonb_build_object('ok',true,'duplicate',true); end if;
  insert into public.marketizo_sign_receipts(request_id,final_pdf,final_sha256,manifest,manifest_sha256,seal) values(r.id,bytes,h,p_data->'manifest',p_data->>'manifestSha256',p_data->>'seal');
  update public.marketizo_sign_requests set status='signed' where id=r.id;
  update public.marketizo_sign_documents set status='signed',revision=revision+1,updated_at=t where id=r.document_id;
  perform public.marketizo_sign_log(p_organization,r.document_id,'completed','system',h,jsonb_build_object('originalSha256',r.original_sha256,'manifestSha256',p_data->>'manifestSha256'));
  return jsonb_build_object('ok',true,'finalSha256',h);
 end if;
 if r.status in ('voided','declined','expired') or (r.expires_at<=t and r.status not in ('signed','finalizing')) or r.expires_at+interval '30 days'<=t then return jsonb_build_object('ok',false,'status',410,'error','Zahtev je zatvoren ili je istekao.'); end if;
 select * into p from public.marketizo_sign_parties where id=p.id for update;
 if p_action='exchange' then
  if (select count(*) from public.marketizo_sign_sessions where party_id=p.id and created_at>t-interval '1 hour')>=30 then return jsonb_build_object('ok',false,'status',429,'error','Previše pokušaja pristupa.'); end if;
  insert into public.marketizo_sign_sessions(digest,party_id,expires_at,context) values(p_data->>'sessionDigest',p.id,t+interval '30 minutes',p_data->'context');
  return jsonb_build_object('ok',true);
 end if;
 if p_action='view' then
  select snapshot into item from public.marketizo_sign_versions where id=r.version_id;
  return jsonb_build_object('ok',true,'title',item->>'title','status',r.status,'requestId',r.id,'verified',s.verified_at is not null,'accepted',p.accepted_at is not null,
   'name',case when s.verified_at is not null then p.recipient->>'name' else null end,
   'email',left(p.recipient->>'email',1)||'***@'||split_part(p.recipient->>'email','@',2),
   'pdfSha256',case when s.verified_at is not null then r.original_sha256 else null end,'expiresAt',r.expires_at,'issuer',r.issuer);
 end if;
 if p_action='otp_target' then return jsonb_build_object('ok',true,'email',p.recipient->>'email'); end if;
 if p_action='otp_issue' then
  if r.expires_at<=t and r.status not in ('signed','finalizing') then return jsonb_build_object('ok',false,'status',409,'error','Pristup više nije dostupan.'); end if;
  if p.last_otp_at>t-interval '60 seconds' or (p.otp_window>t-interval '1 hour' and p.otp_count>=5) then return jsonb_build_object('ok',false,'status',429,'error','Sačekaj pre ponovnog slanja koda.'); end if;
  update public.marketizo_sign_parties set challenge_id=(p_data->>'challengeId')::uuid,otp_sha256=p_data->>'otpDigest',otp_session=s.digest,otp_expires_at=t+interval '10 minutes',otp_attempts=0,last_otp_at=t,
   otp_count=case when otp_window>t-interval '1 hour' then otp_count+1 else 1 end,otp_window=case when otp_window>t-interval '1 hour' then otp_window else t end where id=p.id;
  update public.marketizo_sign_sessions set verified_at=null,pdf_seen_at=null where digest=s.digest;
  insert into public.marketizo_sign_outbox(id,request_id,party_id,kind,sealed_payload,expires_at) values((p_data->>'challengeId')::uuid,r.id,p.id,'otp',p_data->>'sealedMail',t+interval '10 minutes');
  perform public.marketizo_sign_log(p_organization,r.document_id,'otp_queued',p.id::text,r.original_sha256,'{}');
  return jsonb_build_object('ok',true,'email',p.recipient->>'email','challengeId',p_data->>'challengeId');
 end if;
 if p_action='otp_verify' then
  if p.otp_session is distinct from s.digest or p.challenge_id is distinct from (p_data->>'challengeId')::uuid or p.otp_expires_at<=t or p.otp_attempts>=5 or p.otp_sha256 is null then return jsonb_build_object('ok',false,'status',401,'error','Kod je istekao ili nije važeći.'); end if;
  update public.marketizo_sign_parties set otp_attempts=otp_attempts+1 where id=p.id;
  if p.otp_sha256 is distinct from p_data->>'otpDigest' then
   perform public.marketizo_sign_log(p_organization,r.document_id,'otp_failed',p.id::text,r.original_sha256,'{}'); return jsonb_build_object('ok',false,'status',401,'error','Kod nije tačan.');
  end if;
  update public.marketizo_sign_parties set otp_sha256=null where id=p.id;
  update public.marketizo_sign_sessions set verified_at=t where digest=s.digest;
  perform public.marketizo_sign_log(p_organization,r.document_id,'otp_verified',p.id::text,r.original_sha256,s.context);
  return jsonb_build_object('ok',true);
 end if;
 if s.verified_at is null then return jsonb_build_object('ok',false,'status',401,'error','Prvo potvrdi e-mail kodom.'); end if;
 if p_action='pdf' then
  update public.marketizo_sign_sessions set pdf_seen_at=t where digest=s.digest;
  perform public.marketizo_sign_log(p_organization,r.document_id,'pdf_accessed',p.id::text,r.original_sha256,s.context);
  return jsonb_build_object('ok',true,'pdfBase64',encode(r.original_pdf,'base64'),'pdfSha256',r.original_sha256);
 end if;
 if p_action='decline' then
  if p.accepted_at is not null or r.status in ('finalizing','signed') then return jsonb_build_object('ok',false,'status',409,'error','Prihvatanje je već zabeleženo.'); end if;
  update public.marketizo_sign_requests set status='declined' where id=r.id;
  update public.marketizo_sign_documents set status='declined',revision=revision+1,updated_at=t where id=r.document_id;
  update public.marketizo_sign_outbox set state='cancelled',sealed_payload=null where request_id=r.id and state<>'done';
  perform public.marketizo_sign_log(p_organization,r.document_id,'declined',p.id::text,r.original_sha256,jsonb_build_object('reason',left(p_data->>'reason',1000)));
  return jsonb_build_object('ok',true);
 end if;
 if p_action in ('receipt','evidence') then
  select * into receipt from public.marketizo_sign_receipts where request_id=r.id;
  if receipt.request_id is null then return jsonb_build_object('ok',false,'status',409,'error','Dokazni paket se priprema.'); end if;
  if p_action='receipt' then return jsonb_build_object('ok',true,'pdfBase64',encode(receipt.final_pdf,'base64'),'pdfSha256',receipt.final_sha256); end if;
  return jsonb_build_object('ok',true,'manifest',receipt.manifest,'manifestSha256',receipt.manifest_sha256,'seal',receipt.seal,'finalSha256',receipt.final_sha256);
 end if;
 if p_action='accept' then
  if p.accepted_at is not null then
   if p.accepted_command=(p_data->>'commandId')::uuid and p.accepted_payload_sha256=p_data->>'payloadSha256' then return jsonb_build_object('ok',true,'requestId',r.id,'duplicate',true); end if;
   return jsonb_build_object('ok',false,'status',409,'error','Prihvatanje je već zabeleženo.');
  end if;
  if r.expires_at<=t or r.status not in ('queued','open') or s.verified_at<t-interval '10 minutes' or s.pdf_seen_at is null
   or r.original_sha256 is distinct from p_data->>'pdfSha256' or coalesce(p_data->>'accepted','')<>'true' or coalesce(p_data->>'authority','')<>'true'
   or lower(trim(coalesce(p_data->'signature'->>'name','')))<>lower(trim(p.recipient->>'name')) or coalesce(length(p_data->>'consentText'),0)<30 then return jsonb_build_object('ok',false,'status',400,'error','Potvrdi PDF, ime, nameru i ovlašćenje. Po potrebi zatraži novi kod.'); end if;
  update public.marketizo_sign_parties set accepted_at=t,accepted_command=(p_data->>'commandId')::uuid,accepted_payload_sha256=p_data->>'payloadSha256',signature=(p_data->'signature')||jsonb_build_object('context',s.context,'otpVerifiedAt',s.verified_at),consent_text=p_data->>'consentText' where id=p.id;
  perform public.marketizo_sign_log(p_organization,r.document_id,'ses_accepted',p.id::text,r.original_sha256,jsonb_build_object('name',p_data->'signature'->>'name','consentVersion','ses-1','context',s.context));
  if not exists(select 1 from public.marketizo_sign_parties where request_id=r.id and accepted_at is null) then
   update public.marketizo_sign_requests set status='finalizing' where id=r.id;
   insert into public.marketizo_sign_outbox(request_id,kind,expires_at) values(r.id,'finalize',t+interval '7 days') on conflict do nothing;
  end if;
  update public.marketizo_sign_documents set status='signing',revision=revision+1,updated_at=t where id=r.document_id;
  return jsonb_build_object('ok',true,'requestId',r.id);
 end if;
 return jsonb_build_object('ok',false,'status',400,'error','Nepoznata radnja.');
end; $$;

do $$ declare tbl text; begin
 foreach tbl in array array['marketizo_sign_requests','marketizo_sign_parties','marketizo_sign_sessions','marketizo_sign_outbox','marketizo_sign_receipts','marketizo_sign_rates','marketizo_sign_prepared_pdfs'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('revoke all on public.%I from public,anon,authenticated',tbl);
  execute format('grant select,insert,update on public.%I to service_role',tbl);
  execute format('create policy sign_service on public.%I for all to service_role using(true) with check(true)',tbl);
 end loop;
end $$;
revoke update on public.marketizo_sign_receipts from service_role;
revoke update on public.marketizo_sign_prepared_pdfs from service_role;
revoke all on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_log(text,uuid,text,text,text,jsonb),public.marketizo_sign_request_guard(),public.marketizo_sign_party_guard() from public,anon,authenticated;
grant execute on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_log(text,uuid,text,text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
