begin;
create or replace function public.marketizo_read_session_state_compact(p_role text,p_employee_id text,p_client_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  result=public.marketizo_read_session_state(p_role,p_employee_id,p_client_id);
  if result is null then return null; end if;
  result=jsonb_set(result,'{payload,clients}',coalesce((select jsonb_agg(
    (client-'contractFileData') || jsonb_build_object('contractFileAvailable',length(coalesce(client->>'contractFileData',''))>0)
    order by ordinal) from jsonb_array_elements(coalesce(result->'payload'->'clients','[]'::jsonb)) with ordinality t(client,ordinal)),'[]'::jsonb));
  return result;
end $$;
revoke all on function public.marketizo_read_session_state_compact(text,text,text) from public, anon, authenticated;
grant execute on function public.marketizo_read_session_state_compact(text,text,text) to service_role;
commit;
