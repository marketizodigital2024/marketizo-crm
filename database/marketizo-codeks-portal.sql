-- Portal links are independent of the scrubbed delivery outbox.
begin;
create table public.marketizo_codeks_portal_links (
 party_id uuid primary key references public.marketizo_sign_parties(id),
 digest text not null unique check(digest~'^[a-f0-9]{64}$')
);
alter table public.marketizo_codeks_portal_links enable row level security;
create policy codeks_service on public.marketizo_codeks_portal_links for all to service_role using(true) with check(true);
revoke all on public.marketizo_codeks_portal_links from public,anon,authenticated;
grant select,insert on public.marketizo_codeks_portal_links to service_role;
create or replace function public.marketizo_codeks_portal_link(p_organization text,p_document uuid,p_employee text,p_digest text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare d public.marketizo_sign_documents%rowtype; r public.marketizo_sign_requests%rowtype;
 p public.marketizo_sign_parties%rowtype;
begin
 if p_digest is null or p_digest!~'^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'status',400,'error','Proveri poziv.'); end if;
 select * into d from public.marketizo_sign_documents where id=p_document and organization_id=p_organization;
 if not found or d.archived_at is not null or d.category<>'other'
  or split_part(d.data->>'note','|',1)<>'marketizo-codeks:v1'
  or split_part(d.data->>'note','|',4) is distinct from p_employee
  or jsonb_array_length(d.data->'recipients')<>1 then
  return jsonb_build_object('ok',false,'status',404,'error','Kodeks nije pronađen.');
 end if;
 select * into r from public.marketizo_sign_requests where document_id=d.id and organization_id=p_organization for update;
 if not found or r.status not in ('queued','open') or r.expires_at<=clock_timestamp() then
  return jsonb_build_object('ok',false,'status',409,'error','Poziv nije aktivan. Osveži listu kodeksa.');
 end if;
 select * into p from public.marketizo_sign_parties where request_id=r.id;
 if not found or p.accepted_at is not null then
  return jsonb_build_object('ok',false,'status',409,'error','Potpis je već sačuvan. Osveži listu kodeksa.');
 end if;
 -- Only the authenticated, assigned portal path calls this service-role RPC.
 -- A stable server-derived token makes retries and simultaneous tabs safe.
 insert into public.marketizo_codeks_portal_links(party_id,digest) values(p.id,p_digest) on conflict(party_id) do nothing;
 if not exists(select 1 from public.marketizo_codeks_portal_links where party_id=p.id and digest=p_digest) then
  return jsonb_build_object('ok',false,'status',409,'error','Poziv nije potvrđen. Obrati se administratoru.');
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.marketizo_codeks_portal_link(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.marketizo_codeks_portal_link(text,uuid,text,text) to service_role;
-- Recognize an additional portal capability without rewriting immutable invitation identity.
alter function public.marketizo_sign_flow(text,text,jsonb) rename to marketizo_sign_flow_before_codeks;
create function public.marketizo_sign_flow(p_organization text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare original_digest text;
begin
 if p_action='link_exchange' then
  select p.invitation_sha256 into original_digest
   from public.marketizo_codeks_portal_links l
   join public.marketizo_sign_parties p on p.id=l.party_id
   join public.marketizo_sign_requests r on r.id=p.request_id
   where l.digest=p_data->>'invitationDigest' and r.organization_id=p_organization;
  if found then p_data:=p_data||jsonb_build_object('invitationDigest',original_digest); end if;
 end if;
 return public.marketizo_sign_flow_before_codeks(p_organization,p_action,p_data);
end $$;
revoke all on function public.marketizo_sign_flow(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_flow(text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
