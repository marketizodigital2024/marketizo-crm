-- Expose only the frozen onboarding source to the existing scoped signing session.
-- This does not complete identity, mark the personalized PDF viewed, or accept anything.
begin;
alter function public.marketizo_sign_flow(text,text,jsonb) rename to marketizo_sign_flow_before_read_first;
create function public.marketizo_sign_flow(p_organization text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare result jsonb; r public.marketizo_sign_requests%rowtype;
begin
 if p_action<>'onboarding_preview' then return public.marketizo_sign_flow_before_read_first(p_organization,p_action,p_data); end if;
 result:=public.marketizo_sign_flow_before_read_first(p_organization,'link_view',p_data);
 if result->>'ok' is distinct from 'true' then return result; end if;
 if result->>'clientReceiptEmail' is distinct from 'true' then return jsonb_build_object('ok',false,'status',403,'error','Pregled nije dostupan.'); end if;
 select q.* into r from public.marketizo_sign_requests q join public.marketizo_sign_parties p on p.request_id=q.id join public.marketizo_sign_sessions s on s.party_id=p.id where q.organization_id=p_organization and s.digest=p_data->>'sessionDigest' and s.expires_at>clock_timestamp();
 if r.id is null then return jsonb_build_object('ok',false,'status',401,'error','Ponovo otvori link.'); end if;
 return jsonb_build_object('ok',true,'pdfBase64',encode(r.original_pdf,'base64'),'pdfSha256',r.original_sha256);
end $$;
revoke all on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_read_first(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_flow(text,text,jsonb),public.marketizo_sign_flow_before_read_first(text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
