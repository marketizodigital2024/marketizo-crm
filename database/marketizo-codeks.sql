-- Additive policy acknowledgement support. Apply after marketizo-sign-completion.sql.
-- Existing contract identity requirements and all table permissions remain unchanged.
begin;
create or replace function public.marketizo_sign_required_fields(rec jsonb, doc jsonb) returns text[]
language plpgsql immutable security invoker set search_path=pg_catalog,public as $$
declare fields text[]:=array['name','country'];
begin
 if doc->>'category'='other' and left(coalesce(doc->>'note',''),length('marketizo-codeks:v1|'))='marketizo-codeks:v1|' then
  return array['name'];
 end if;
 if coalesce(rec->>'role','counterparty')<>'marketizo' then
  fields:=fields||array['address'];
  if rec->>'partyType'='business' then fields:=fields||array['company','taxId']; end if;
  if (doc->'content')::text ~* 'JMBG' then fields:=fields||array['personalId']; end if;
 end if;
 return fields;
end $$;
revoke all on function public.marketizo_sign_required_fields(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_required_fields(jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
