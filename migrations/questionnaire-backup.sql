-- Additive only: no employee or questionnaire rows are changed by this migration.
create or replace function public.marketizo_questionnaire_snapshot()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('format','marketizo-questionnaires-v1','namespace','production','rows',
    coalesce(jsonb_agg(jsonb_build_object('id',id,'payload',payload,'updated_at',updated_at) order by id), '[]'::jsonb))
  from public.marketizo_questionnaires where namespace='production';
$$;
revoke all on function public.marketizo_questionnaire_snapshot() from public,anon,authenticated;
grant execute on function public.marketizo_questionnaire_snapshot() to service_role;

create or replace function public.marketizo_restore_complete_backup(
  p_state jsonb,p_kpi jsonb,p_expected_state_at timestamptz,p_expected_kpi_at timestamptz,
  p_questionnaires jsonb,p_expected_questionnaires jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare restored jsonb; restored_at timestamptz := clock_timestamp();
begin
  if p_questionnaires is not null then
    if p_questionnaires->>'format' is distinct from 'marketizo-questionnaires-v1'
       or p_questionnaires->>'namespace' is distinct from 'production'
       or jsonb_typeof(p_questionnaires->'rows') is distinct from 'array' then
      raise exception 'Invalid questionnaire snapshot';
    end if;
    if exists(select 1 from jsonb_array_elements(p_questionnaires->'rows') r
      where jsonb_typeof(r->'id') is distinct from 'string' or coalesce(r->>'id','')=''
        or jsonb_typeof(r->'payload') is distinct from 'object'
        or not (coalesce(r->'payload'->>'recordType','')='invite' or
          (r->>'id' like 'template:%' and jsonb_typeof(r->'payload'->'questions')='array'))
        or r->>'updated_at' is null)
      or (select count(*)<>count(distinct r->>'id') from jsonb_array_elements(p_questionnaires->'rows') r) then
      raise exception 'Invalid questionnaire rows';
    end if;
    -- Lock only during an explicitly requested restore, never during normal backup.
    lock table public.marketizo_questionnaires in share row exclusive mode;
    if public.marketizo_questionnaire_snapshot()->'rows' is distinct from p_expected_questionnaires->'rows' then
      return jsonb_build_object('ok',false,'conflict',true,'questionnairesConflict',true);
    end if;
  end if;
  restored := public.marketizo_restore_backup(p_state,p_kpi,p_expected_state_at,p_expected_kpi_at);
  if not coalesce((restored->>'ok')::boolean,false) then return restored; end if;
  if p_questionnaires is not null then
    delete from public.marketizo_questionnaires where namespace='production';
    insert into public.marketizo_questionnaires(namespace,id,payload,updated_at)
      select 'production',r->>'id',r->'payload',greatest(restored_at,(r->>'updated_at')::timestamptz + interval '1 millisecond')
      from jsonb_array_elements(p_questionnaires->'rows') r;
    if jsonb_typeof(p_questionnaires->'defaultTemplates') = 'object' then
      insert into public.marketizo_questionnaires(namespace,id,payload,updated_at)
        select 'production','template:' || key,value,restored_at
        from jsonb_each(p_questionnaires->'defaultTemplates')
        on conflict(namespace,id) do nothing;
    end if;
  end if;
  return restored || jsonb_build_object('questionnairesRestored',p_questionnaires is not null,
    'questionnaireRecords',coalesce(jsonb_array_length(p_questionnaires->'rows'),0));
end;
$$;
revoke all on function public.marketizo_restore_complete_backup(jsonb,jsonb,timestamptz,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_restore_complete_backup(jsonb,jsonb,timestamptz,timestamptz,jsonb,jsonb) to service_role;
grant delete on public.marketizo_questionnaires to service_role;
