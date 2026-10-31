-- Add quantities only to existing named activities; never invent historical counts.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
insert into public.agency_crm_state(id,payload,updated_at)
select 'backup-before-additional-metrics-20261031',jsonb_build_object('format','activity-metrics-before-extension-v1','rules',coalesce((select jsonb_agg(to_jsonb(m) order by activity_id) from public.marketizo_activity_metrics m),'[]'::jsonb),'mainChecksum',(select md5(payload::text) from public.agency_crm_state where id='marketizo-main')),clock_timestamp()
on conflict(id) do nothing;
alter table public.marketizo_activity_metrics drop constraint marketizo_activity_metrics_unit_check;
alter table public.marketizo_activity_metrics add constraint marketizo_activity_metrics_unit_check check(unit in ('scenario','scenario_revision','clip','clip_revision','story','post','task','call','shoot','clip_check','voiceover','none'));
create or replace function public.marketizo_set_activity_metric(p_actor_id text,p_activity_id text,p_unit text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare source jsonb; actor jsonb; saved public.marketizo_activity_metrics%rowtype;
begin
 select payload into source from public.agency_crm_state where id='marketizo-main' for update;
 select e into actor from jsonb_array_elements(source->'employees') e where e->>'id'=p_actor_id and coalesce(e->>'status','')<>'Neaktivan' and coalesce(e->>'active','true')<>'false';
 if actor is null or p_actor_id not in ('emp-miljan','emp-ivana') then return jsonb_build_object('ok',false,'status',403,'error','Samo vlasnik menja jedinice aktivnosti.'); end if;
 if p_unit is null or p_unit not in ('scenario','scenario_revision','clip','clip_revision','story','post','task','call','shoot','clip_check','voiceover','none') or not exists(select 1 from jsonb_array_elements(source->'employeeActivities') a where a->>'id'=p_activity_id) then
 return jsonb_build_object('ok',false,'status',400,'error','Neispravna aktivnost ili jedinica.'); end if;
 perform public.marketizo_capture_work_production_prewrite();
 insert into public.marketizo_activity_metrics(activity_id,unit,updated_by,updated_at) values(p_activity_id,p_unit,p_actor_id,clock_timestamp())
 on conflict(activity_id) do update set unit=excluded.unit,updated_by=excluded.updated_by,updated_at=excluded.updated_at returning * into saved;
 return jsonb_build_object('ok',true,'rule',to_jsonb(saved));
end $$;
revoke all on function public.marketizo_set_activity_metric(text,text,text) from public,anon,authenticated;
grant execute on function public.marketizo_set_activity_metric(text,text,text) to service_role;

do $$
declare desired record; matched text[]; saved_unit text;
begin
 for desired in select * from (values ('Snimanje na terenu','shoot'),('Pravljenje taskova','task'),('Checking Reelova','clip_check'),('Snimanje Voiceovera','voiceover'),('Kvalifikacioni poziv','call')) v(name,unit) loop
  select array_agg(a->>'id') into matched from public.agency_crm_state s cross join lateral jsonb_array_elements(s.payload->'employeeActivities') a where s.id='marketizo-main' and a->>'name'=desired.name;
  if coalesce(cardinality(matched),0)<>1 then raise exception 'Expected exactly one existing activity: %',desired.name; end if;
  insert into public.marketizo_activity_metrics(activity_id,unit,updated_by) values(matched[1],desired.unit,'owner-request-additional-quantities-20261031') on conflict(activity_id) do nothing;
  select unit into saved_unit from public.marketizo_activity_metrics where activity_id=matched[1];
  if saved_unit is distinct from desired.unit then raise exception 'Existing activity rule changed: %',desired.name; end if;
 end loop;
end $$;
commit;
