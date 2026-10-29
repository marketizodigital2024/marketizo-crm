-- Optional copy address is captured atomically with acceptance, separately from the frozen PDF.
begin;
create table public.marketizo_sign_receipt_contacts (
 party_id uuid primary key references public.marketizo_sign_parties(id),
 email text not null check(length(email)<=254 and (email='' or email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.marketizo_sign_receipt_contacts enable row level security;
revoke all on public.marketizo_sign_receipt_contacts from public,anon,authenticated,service_role;
grant select,insert on public.marketizo_sign_receipt_contacts to service_role;
create policy sign_service on public.marketizo_sign_receipt_contacts for all to service_role using(true) with check(true);
create trigger receipt_contact_immutable before update or delete on public.marketizo_sign_receipt_contacts for each row execute function public.marketizo_sign_immutable();
do $$ declare definition text; old_rule text:=$old$coalesce(trim(e->>'email'),'')='' or (coalesce(v_data->>'recipientCompletion','false')<>'true'$old$;
begin
 definition:=pg_get_functiondef('public.marketizo_sign_command(text,text,uuid,text,jsonb)'::regprocedure);
 if position(old_rule in definition)=0 then raise exception 'Unexpected freeze validation'; end if;
 execute replace(definition,old_rule,$new$(coalesce(trim(e->>'email'),'')='' and not (coalesce(v_data->>'note','')='marketizo-onboarding:v3' and v_data->>'category'='clients' and jsonb_array_length(v_data->'recipients')=1)) or (coalesce(v_data->>'recipientCompletion','false')<>'true'$new$);
end $$;
alter function public.marketizo_sign_flow(text,text,jsonb) rename to marketizo_sign_flow_before_optional_email;
create function public.marketizo_sign_flow(p_organization text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare result jsonb; s public.marketizo_sign_sessions%rowtype; p public.marketizo_sign_parties%rowtype;
 r public.marketizo_sign_requests%rowtype; doc jsonb; address text; item jsonb; receipt public.marketizo_sign_receipts%rowtype;
begin
 if p_action in ('link_view','link_accept') then
  -- Retain the existing session, tenant, expiry and request checks.
  result:=public.marketizo_sign_flow_before_optional_email(p_organization,'link_view',p_data);
  if result->>'ok' is distinct from 'true' then return result; end if;
  select * into s from public.marketizo_sign_sessions where digest=p_data->>'sessionDigest' and expires_at>clock_timestamp();
  select * into p from public.marketizo_sign_parties where id=s.party_id;
  select * into r from public.marketizo_sign_requests where id=p.request_id and organization_id=p_organization;
 elsif p_action in ('finalize_data','queue_receipts','receipt_mail_data') then
  select * into r from public.marketizo_sign_requests where id=(p_data->>'requestId')::uuid and organization_id=p_organization;
 else return public.marketizo_sign_flow_before_optional_email(p_organization,p_action,p_data);
 end if;
 select snapshot into doc from public.marketizo_sign_versions where id=r.version_id;
 if coalesce(doc->>'note','')<>'marketizo-onboarding:v3' or doc->>'category'<>'clients' or jsonb_array_length(doc->'recipients')<>1 then
  return public.marketizo_sign_flow_before_optional_email(p_organization,p_action,p_data);
 end if;
 if p_action='link_view' then
  return result||jsonb_build_object('clientReceiptEmail',true,'receiptEmail',coalesce((select email from public.marketizo_sign_receipt_contacts where party_id=p.id),p.recipient->>'email',''));
 end if;
 if p_action='link_accept' then
  if jsonb_typeof(p_data->'receiptEmail') is distinct from 'string' then return jsonb_build_object('ok',false,'status',400,'error','Unesi ispravan mejl za potpisani dokument.'); end if;
  address:=lower(trim(p_data->>'receiptEmail'));
  if address='' or length(address)>254 or (address<>'' and address !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') then return jsonb_build_object('ok',false,'status',400,'error','Unesi ispravan mejl za potpisani dokument.'); end if;
  perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:'||r.document_id::text,1));
  if exists(select 1 from public.marketizo_sign_receipt_contacts where party_id=p.id and email<>address) then return jsonb_build_object('ok',false,'status',409,'error','Podaci su već potvrđeni.'); end if;
  result:=public.marketizo_sign_flow_before_optional_email(p_organization,p_action,p_data);
  if result->>'ok'='true' then
   insert into public.marketizo_sign_receipt_contacts(party_id,email) values(p.id,address) on conflict do nothing;
  end if;
  return result;
 end if;
 if p_action='finalize_data' then
  result:=public.marketizo_sign_flow_before_optional_email(p_organization,p_action,p_data);
  if result->>'ok' is distinct from 'true' then return result; end if;
  return result||jsonb_build_object('signers',(select jsonb_agg(x||jsonb_build_object('receiptEmail',coalesce(c.email,''))) from jsonb_array_elements(result->'signers') x left join public.marketizo_sign_receipt_contacts c on c.party_id=(x->>'id')::uuid));
 end if;
 if p_action='queue_receipts' then
  if r.status is distinct from 'signed' or not exists(select 1 from public.marketizo_sign_receipts where request_id=r.id) then return jsonb_build_object('ok',false,'status',409,'error','PDF još nije sačuvan.'); end if;
  if jsonb_typeof(p_data->'messages') is distinct from 'array' or jsonb_array_length(p_data->'messages')<>(select count(*) from public.marketizo_sign_parties x join public.marketizo_sign_receipt_contacts c on c.party_id=x.id where x.request_id=r.id and c.email<>'') then return jsonb_build_object('ok',false,'status',400,'error','Proveri primaoce.'); end if;
  for item in select value from jsonb_array_elements(p_data->'messages') loop
   if not exists(select 1 from public.marketizo_sign_parties x join public.marketizo_sign_receipt_contacts c on c.party_id=x.id where x.request_id=r.id and x.id=(item->>'partyId')::uuid and c.email=item->>'to' and c.email<>'') then return jsonb_build_object('ok',false,'status',400,'error','Proveri primaoce.'); end if;
   insert into public.marketizo_sign_outbox(request_id,party_id,kind,sealed_payload,expires_at) values(r.id,(item->>'partyId')::uuid,'signed_pdf',item->>'sealedMail',clock_timestamp()+interval '7 days') on conflict do nothing;
  end loop;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='receipt_mail_data' then
  select * into receipt from public.marketizo_sign_receipts where request_id=r.id;
  select c.email into address from public.marketizo_sign_receipt_contacts c join public.marketizo_sign_parties x on x.id=c.party_id where x.request_id=r.id and x.id=(p_data->>'partyId')::uuid;
  if receipt.request_id is null or coalesce(address,'')='' then return jsonb_build_object('ok',false,'status',404,'error','Kopija mejlom nije zatražena.'); end if;
  return jsonb_build_object('ok',true,'to',address,'pdfBase64',encode(receipt.final_pdf,'base64'),'pdfSha256',receipt.final_sha256);
 end if;
 return public.marketizo_sign_flow_before_optional_email(p_organization,p_action,p_data);
end $$;
revoke all on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_optional_email(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_optional_email(text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
