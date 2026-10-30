-- Keep existing snapshots valid; new onboarding documents use the two-page v4 layout.
begin;
do $$ declare item record; source text; updated text; changed integer:=0;
begin
 for item in select oid from pg_proc where pronamespace='public'::regnamespace and (proname in ('marketizo_sign_command','marketizo_sign_required_fields') or proname like 'marketizo_sign_flow%') loop
  source:=pg_get_functiondef(item.oid);updated:=source;
  updated:=replace(updated,$a$coalesce(v_data->>'note','')='marketizo-onboarding:v3'$a$,$b$coalesce(v_data->>'note','') in ('marketizo-onboarding:v3','marketizo-onboarding:v4')$b$);
  updated:=replace(updated,$a$coalesce(doc->>'note','')<>'marketizo-onboarding:v3'$a$,$b$coalesce(doc->>'note','') not in ('marketizo-onboarding:v3','marketizo-onboarding:v4')$b$);
  updated:=replace(updated,$a$doc->>'note'='marketizo-onboarding:v3'$a$,$b$doc->>'note' in ('marketizo-onboarding:v3','marketizo-onboarding:v4')$b$);
  updated:=replace(updated,$a$doc->>'note' is distinct from 'marketizo-onboarding:v3'$a$,$b$coalesce(doc->>'note','') not in ('marketizo-onboarding:v3','marketizo-onboarding:v4')$b$);
  if position('Nedozvoljeno polje.' in updated)>0 and position('completion_submit' in updated)>0 then
   updated:=replace(updated,$a$'personalId','capacity','country'$a$,$b$'personalId','capacity','postalCode','country'$b$);
   updated:=replace(updated,$a$when 'country' then 2 else 80$a$,$b$when 'postalCode' then 20 when 'country' then 2 else 80$b$);
  end if;
  if source<>updated then execute updated;changed:=changed+1;end if;
 end loop;
 if changed<4 then raise exception 'Expected onboarding and completion validators were not found';end if;
end $$;
notify pgrst,'reload schema';
commit;
