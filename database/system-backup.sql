-- Additive, service-only full-domain snapshot and conservative append-only recovery.
-- Existing business rows are not changed by installation. Recovery never rewrites signed history.
begin;
set local lock_timeout='3s';
-- Bounded, read-only export: no large aggregate or long SHARE locks in live backups.
create or replace function public.marketizo_system_domains_manifest()
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='10s' as $$
declare r record; entries jsonb:='{}'; columns jsonb; keys jsonb; ordering text; n bigint; fingerprint text; inventory jsonb; keyargs text; sortselect text; sortnames text;
begin
 for r in select n.nspname ns,c.relname name,c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and ((n.nspname='public' and (c.relname like 'marketizo\_sign\_%' escape '\' or c.relname in ('marketizo_codeks_portal_links','marketizo_audits'))) or (n.nspname='marketizo_private' and c.relname in ('work_log_audit','work_log_recovery_plan'))) order by n.nspname,c.relname loop
  select string_agg(format('t.%I',a.attname),',' order by k.ord) into ordering from pg_catalog.pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,ord) join pg_catalog.pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where i.indrelid=r.oid and i.indisprimary;
  if ordering is null then raise exception 'Snapshot table requires primary key'; end if;
  select jsonb_agg(a.attname order by k.ord) into keys from pg_catalog.pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,ord) join pg_catalog.pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where i.indrelid=r.oid and i.indisprimary;
  select string_agg(format('%L,to_jsonb(t.%I)',a.attname,a.attname),',' order by k.ord),string_agg(format('t.%I as s%s',a.attname,k.ord),',' order by k.ord),string_agg(format('s%s',k.ord),',' order by k.ord) into keyargs,sortselect,sortnames from pg_catalog.pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,ord) join pg_catalog.pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where i.indrelid=r.oid and i.indisprimary;
  execute format($query$with serial as materialized(select jsonb_build_object(%s) k,md5(to_jsonb(t)::text) h,%s from %I.%I t) select count(*),md5(coalesce(string_agg(h,'' order by %s),'')),coalesce(jsonb_agg(jsonb_build_object('key',k,'hash',h) order by %s),'[]') from serial$query$,keyargs,sortselect,r.ns,r.name,sortnames,sortnames) into n,fingerprint,inventory;
  select jsonb_agg(jsonb_build_object('name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'generated',a.attgenerated,'identity',a.attidentity) order by a.attnum) into columns from pg_catalog.pg_attribute a where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped;
  entries=entries||jsonb_build_object(r.ns||'.'||r.name,jsonb_build_object('count',n,'fingerprint',fingerprint,'schema',columns,'keys',keys,'rows',inventory));
 end loop;
 with serial as materialized(select t.id,md5(to_jsonb(t)::text) h from public.agency_crm_state t where t.id not like 'backup-%' and t.id not in ('marketizo-main','marketizo-kpi-v1','marketizo-smm-preview-v1','marketizo-kpi-preview-v1')) select count(*),md5(coalesce(string_agg(h,'' order by id),'')),coalesce(jsonb_agg(jsonb_build_object('key',jsonb_build_object('id',id),'hash',h) order by id),'[]') into n,fingerprint,inventory from serial;
 return jsonb_build_object('format','marketizo-system-manifest-v1','tables',entries,'stateRows',jsonb_build_object('count',n,'fingerprint',fingerprint,'rows',inventory));
end $$;
revoke all on function public.marketizo_system_domains_manifest() from public,anon,authenticated;
grant execute on function public.marketizo_system_domains_manifest() to service_role;
create or replace function public.marketizo_system_domains_page(p_table text,p_offset integer,p_limit integer default 25)
returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='10s' as $$
declare ordering text; result jsonb; target regclass;
begin
 if p_offset<0 or p_limit not between 1 and 250 then raise exception 'Invalid page'; end if;
 if p_table='stateRows' then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.id),'[]') into result from (select * from public.agency_crm_state where id not like 'backup-%' and id not in ('marketizo-main','marketizo-kpi-v1','marketizo-smm-preview-v1','marketizo-kpi-preview-v1') order by id offset p_offset limit p_limit) q;return result;
 end if;
 if p_table !~ '^(public.marketizo_(sign_[a-z_]+|codeks_portal_links|audits)|marketizo_private.work_log_(audit|recovery_plan))$' then raise exception 'Invalid snapshot table'; end if;
 target=pg_catalog.to_regclass(p_table);if target is null then raise exception 'Unknown snapshot table'; end if;
 select string_agg(format('t.%I',a.attname),',' order by k.ord) into ordering from pg_catalog.pg_index i cross join lateral unnest(i.indkey) with ordinality k(attnum,ord) join pg_catalog.pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where i.indrelid=target and i.indisprimary;
 if ordering is null then raise exception 'Snapshot table requires primary key'; end if;
 execute format('select coalesce(jsonb_agg(to_jsonb(q)),''[]'') from (select t.* from %s t order by %s offset $1 limit $2) q',target,ordering) into result using p_offset,p_limit;
 return result;
end $$;
revoke all on function public.marketizo_system_domains_page(text,integer,integer) from public,anon,authenticated;
grant execute on function public.marketizo_system_domains_page(text,integer,integer) to service_role;

-- One read-only MVCC statement binds core state and the exact domain row keys.
-- Later work logs may continue; they belong to the next backup, not this anchor.
create or replace function public.marketizo_backup_export_anchor()
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('payload',s.payload,'updated_at',s.updated_at,
  'kpi',(select to_jsonb(k) from public.agency_crm_state k where k.id='marketizo-kpi-v1'),
  'production',jsonb_build_object('format','marketizo-work-production-v1',
    'rules',(select coalesce(jsonb_agg(to_jsonb(r) order by r.activity_id),'[]') from public.marketizo_activity_metrics r),
    'outputs',(select coalesce(jsonb_agg(to_jsonb(o) order by o.log_id),'[]') from public.marketizo_work_outputs o)),
  'questionnaires',public.marketizo_questionnaire_snapshot(),
  'manifest',public.marketizo_system_domains_manifest())
 from public.agency_crm_state s where s.id='marketizo-main';
$$;
revoke all on function public.marketizo_backup_export_anchor() from public,anon,authenticated;
grant execute on function public.marketizo_backup_export_anchor() to service_role;
create or replace function public.marketizo_system_domains_keyed_page(p_table text,p_keys jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='10s' as $$
declare target regclass; join_keys text; filter text:=''; result jsonb;
begin
 if jsonb_typeof(p_keys) is distinct from 'array' or jsonb_array_length(p_keys) not between 1 and 250 then raise exception 'Invalid page keys';end if;
 if p_table='stateRows' then target='public.agency_crm_state'::regclass;filter=$where$ where t.id not like 'backup-%' and t.id not in ('marketizo-main','marketizo-kpi-v1','marketizo-smm-preview-v1','marketizo-kpi-preview-v1')$where$;
 elsif p_table ~ '^(public\.marketizo_(sign_[a-z_]+|codeks_portal_links|audits)|marketizo_private\.work_log_(audit|recovery_plan))$' then target=pg_catalog.to_regclass(p_table);
 else raise exception 'Invalid snapshot table';end if;
 if target is null then raise exception 'Unknown snapshot table';end if;
 select string_agg(format('t.%I=k.%I',a.attname,a.attname),' and ' order by key.ord) into join_keys from pg_catalog.pg_index i cross join lateral unnest(i.indkey) with ordinality key(attnum,ord) join pg_catalog.pg_attribute a on a.attrelid=i.indrelid and a.attnum=key.attnum where i.indrelid=target and i.indisprimary;
 if join_keys is null then raise exception 'Snapshot table requires primary key';end if;
 execute format($query$select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(t) order by wanted.ord),'[]'),'fingerprints',coalesce(jsonb_agg(md5(to_jsonb(t)::text) order by wanted.ord),'[]')) from jsonb_array_elements($1) with ordinality wanted(v,ord) cross join lateral jsonb_populate_record(null::%s,wanted.v) k join %s t on %s%s$query$,target,target,join_keys,filter) into result using p_keys;
 return result;
end $$;
revoke all on function public.marketizo_system_domains_keyed_page(text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_system_domains_keyed_page(text,jsonb) to service_role;

-- No UPDATE/DELETE of Sign history, no disabling triggers or constraints.
-- SECURITY DEFINER is necessary to recover missing audit rows/sequences without
-- granting unrestricted table writes to the application. Execution is service-only.
create or replace function public.marketizo_restore_complete_system_backup(
 p_state jsonb,p_kpi jsonb,p_expected_state_at timestamptz,p_expected_kpi_at timestamptz,
 p_questionnaires jsonb,p_expected_questionnaires jsonb,p_production jsonb,p_expected_production jsonb,
 p_domains jsonb,p_expected_domains jsonb
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='3s' as $$
declare current_domains jsonb; current_manifest jsonb; expected_count bigint; expected_hash text; remaining text[]; selected text; cols text; r record; target jsonb; bad boolean; restored jsonb; seq text; highest bigint; seq_value bigint;
begin
 lock table public.agency_crm_state in share row exclusive mode;
 for r in select n.nspname ns,c.relname name from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and ((n.nspname='public' and (c.relname like 'marketizo\_sign\_%' escape '\' or c.relname in ('marketizo_codeks_portal_links','marketizo_audits'))) or (n.nspname='marketizo_private' and c.relname in ('work_log_audit','work_log_recovery_plan'))) order by n.nspname,c.relname loop
  execute format('lock table %I.%I in share row exclusive mode',r.ns,r.name);
 end loop;
 current_manifest=public.marketizo_system_domains_manifest();
 select jsonb_build_object('schema',jsonb_object_agg(key,value->'schema'),'tables',jsonb_object_agg(key,'[]'::jsonb)) into current_domains from jsonb_each(current_manifest->'tables');
 if p_domains is not null then
  for r in select key name,value meta from jsonb_each(current_manifest->'tables') union all select 'stateRows',current_manifest->'stateRows' loop
   target=case when r.name='stateRows' then p_expected_domains->'stateRows' else p_expected_domains->'tables'->r.name end;
   if jsonb_typeof(target) is distinct from 'array' then return jsonb_build_object('ok',false,'systemConflict',true);end if;
   select count(*),md5(coalesce(string_agg(md5(v::text),'' order by ord),'')) into expected_count,expected_hash from jsonb_array_elements(target) with ordinality x(v,ord);
   if expected_count is distinct from (r.meta->>'count')::bigint or expected_hash is distinct from r.meta->>'fingerprint' then return jsonb_build_object('ok',false,'systemConflict',true);end if;
  end loop;
  if p_domains->>'format' is distinct from 'marketizo-system-domains-v1' or p_domains->'schema' is distinct from current_domains->'schema'
   or (select array_agg(k order by k) from jsonb_object_keys(p_domains->'tables') k) is distinct from (select array_agg(k order by k) from jsonb_object_keys(current_domains->'tables') k)
   or jsonb_typeof(p_domains->'stateRows') is distinct from 'array' then raise exception 'System backup schema mismatch'; end if;
  if exists(select 1 from jsonb_array_elements(p_domains->'stateRows') v where coalesce(v->>'id','')='' or v->>'id' like 'backup-%' or v->>'id' in ('marketizo-main','marketizo-kpi-v1','marketizo-smm-preview-v1','marketizo-kpi-preview-v1')) then raise exception 'Invalid extra state row'; end if;
  select array_agg(k order by k) into remaining from jsonb_object_keys(p_domains->'tables') k;
  while cardinality(remaining)>0 loop
   select x into selected from unnest(remaining) x where not exists(
    select 1 from pg_catalog.pg_constraint c where c.contype='f' and c.conrelid=x::regclass and c.confrelid<>c.conrelid and c.confrelid=any(remaining::regclass[])) order by x limit 1;
   if selected is null then raise exception 'Unsupported cyclic recovery dependency'; end if;
   target=p_domains->'tables'->selected;
   if jsonb_typeof(target) is distinct from 'array' then raise exception 'Invalid table backup'; end if;
   select string_agg(format('%I',a.attname),',' order by a.attnum) into cols from pg_catalog.pg_attribute a where a.attrelid=selected::regclass and a.attnum>0 and not a.attisdropped and a.attgenerated='';
   execute format('insert into %s (%s) overriding system value select %s from jsonb_populate_recordset(null::%s,$1) on conflict do nothing',selected::regclass,cols,cols,selected::regclass) using target;
   execute format('select exists(select value from jsonb_array_elements($1) except select to_jsonb(t) from %s t)',selected::regclass) into bad using target;
   if bad then raise exception 'Existing domain record differs; recovery stopped'; end if;
   for r in select a.attname from pg_catalog.pg_attribute a where a.attrelid=selected::regclass and a.attidentity<>'' and a.attnum>0 loop
    seq=pg_catalog.pg_get_serial_sequence(selected,r.attname);
    execute format('select max(%I) from %s',r.attname,selected::regclass) into highest;
    if highest is not null and seq is not null then
     execute format('select last_value from %s',seq::regclass) into seq_value;
     perform pg_catalog.setval(seq::regclass,greatest(highest,seq_value),true);
    end if;
   end loop;
   remaining=array_remove(remaining,selected);
  end loop;
  insert into public.agency_crm_state select * from jsonb_populate_recordset(null::public.agency_crm_state,p_domains->'stateRows') on conflict do nothing;
  if exists(select 1 from jsonb_array_elements(p_domains->'stateRows') wanted where not exists(select 1 from public.agency_crm_state t where to_jsonb(t)=wanted)) then raise exception 'Existing financial/evidence row differs; recovery stopped'; end if;
 end if;
 restored=public.marketizo_restore_complete_backup_with_production(p_state,p_kpi,p_expected_state_at,p_expected_kpi_at,p_questionnaires,p_expected_questionnaires,p_production,p_expected_production);
 if not coalesce((restored->>'ok')::boolean,false) then
  -- Raise instead of returning: no partial insert is allowed when core CAS fails.
  raise exception 'Core recovery conflict';
 end if;
 return restored||jsonb_build_object('systemDomainsRecovered',p_domains is not null,'recoveryPolicy','preserve-existing-recover-missing');
end $$;
revoke all on function public.marketizo_restore_complete_system_backup(jsonb,jsonb,timestamptz,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_restore_complete_system_backup(jsonb,jsonb,timestamptz,timestamptz,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to service_role;
-- Retire the unused unbounded helpers from the preparatory migration.
-- Application exports use the bounded manifest/page RPCs above.
drop function if exists public.marketizo_complete_system_snapshot();
drop function if exists public.marketizo_system_domains_snapshot();
commit;
