-- Additive maintenance setup; run after the base and flow scripts.
-- Never deletes contracts, acceptance records, versions, receipts or audit events.
begin;
create or replace function public.marketizo_sign_maintenance(p_organization text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare candidate record; r public.marketizo_sign_requests%rowtype;
 t timestamptz:=clock_timestamp(); expired integer:=0; sessions integer:=0;
 challenges integer:=0; payloads integer:=0; rates integer:=0;
begin
 if nullif(trim(p_organization),'') is null then raise exception 'Organization required'; end if;
 -- Same advisory-lock-before-row-lock order as the signing transaction.
 for candidate in select id,document_id from public.marketizo_sign_requests
  where organization_id=p_organization and status in ('queued','open') and expires_at<=t
  order by expires_at,id limit 100
 loop
  if not pg_try_advisory_xact_lock(hashtextextended('marketizo-sign:'||candidate.document_id::text,1)) then continue; end if;
  select * into r from public.marketizo_sign_requests where id=candidate.id and organization_id=p_organization
   and status in ('queued','open') and expires_at<=t for update skip locked;
  if not found then continue; end if;
  update public.marketizo_sign_requests set status='expired' where id=r.id;
  update public.marketizo_sign_documents set status='expired',revision=revision+1,updated_at=t
   where id=r.document_id and organization_id=p_organization and status in ('ready','sent','viewed','signing');
  update public.marketizo_sign_outbox set state='cancelled',sealed_payload=null,lease_id=null,lease_until=null
   where request_id=r.id and state in ('queued','leased');
  perform public.marketizo_sign_log(p_organization,r.document_id,'expired','system',r.original_sha256,jsonb_build_object('requestId',r.id));
  expired:=expired+1;
 end loop;
 -- Retain session context if it supports an already recorded acceptance.
 -- Its immutable audit event / receipt also remains intact.
 with doomed as (
  select s.digest from public.marketizo_sign_sessions s
  join public.marketizo_sign_parties p on p.id=s.party_id
  join public.marketizo_sign_requests q on q.id=p.request_id
  where q.organization_id=p_organization and s.expires_at<=t and s.created_at<t-interval '1 hour'
   and p.accepted_at is null
  order by s.expires_at,s.digest limit 1000 for update of s skip locked
 ) delete from public.marketizo_sign_sessions s using doomed d where s.digest=d.digest;
 get diagnostics sessions=row_count;
 with expired_codes as (
  select p.id from public.marketizo_sign_parties p join public.marketizo_sign_requests q on q.id=p.request_id
  where q.organization_id=p_organization and p.otp_expires_at<=t
   and (p.otp_sha256 is not null or p.otp_session is not null or p.challenge_id is not null)
  order by p.otp_expires_at,p.id limit 1000 for update of p skip locked
 ) update public.marketizo_sign_parties p set challenge_id=null,otp_sha256=null,otp_session=null,otp_expires_at=null,otp_attempts=0
  from expired_codes e where p.id=e.id;
 get diagnostics challenges=row_count;
 with spent as (
  select o.id from public.marketizo_sign_outbox o join public.marketizo_sign_requests q on q.id=o.request_id
  where q.organization_id=p_organization and o.sealed_payload is not null
   and (o.state in ('done','failed','cancelled') or o.expires_at<=t)
   and not (o.state='leased' and o.lease_until>t)
  order by o.created_at,o.id limit 1000 for update of o skip locked
 ) update public.marketizo_sign_outbox o set sealed_payload=null,
   state=case when o.state in ('queued','leased') then 'failed' else o.state end,
   lease_id=null,lease_until=null from spent s where o.id=s.id;
 get diagnostics payloads=row_count;
 -- Rate keys are project-wide HMAC values; old minute windows expire globally.
 with old_rates as (select key,window_start from public.marketizo_sign_rates
  where window_start<t-interval '24 hours' order by window_start,key limit 1000 for update skip locked)
 delete from public.marketizo_sign_rates r using old_rates o where r.key=o.key and r.window_start=o.window_start;
 get diagnostics rates=row_count;
 return jsonb_build_object('ok',true,'expired',expired,'sessions',sessions,'challenges',challenges,'payloads',payloads,'rates',rates);
end; $$;
revoke all on function public.marketizo_sign_maintenance(text) from public,anon,authenticated;
grant execute on function public.marketizo_sign_maintenance(text) to service_role;
grant delete on public.marketizo_sign_sessions,public.marketizo_sign_rates to service_role;
create index if not exists marketizo_sign_requests_expiry on public.marketizo_sign_requests(organization_id,expires_at,id) where status in ('queued','open');
create index if not exists marketizo_sign_sessions_expiry on public.marketizo_sign_sessions(expires_at,digest);
create index if not exists marketizo_sign_rates_expiry on public.marketizo_sign_rates(window_start,key);
commit;
