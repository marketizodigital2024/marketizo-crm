-- Marketizo Sign phase 1. Reviewed setup script, NOT applied to production.
-- Run on a test database first. Existing CRM records are never rewritten.
begin;
create table public.marketizo_sign_documents (
  id uuid primary key,
  organization_id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  title text not null,
  category text not null check (category in ('clients','employees','nda','annexes','other')),
  recipient_names text not null default '',
  recipient_emails text not null default '',
  search_text text not null default '',
  status text not null default 'draft' check (status in ('draft','ready','sent','viewed','signing','signed','declined','expired','voided')),
  revision integer not null check (revision > 0),
  archived_at timestamptz,
  created_by text not null,
  updated_at timestamptz not null default clock_timestamp()
);
create table public.marketizo_sign_templates (like public.marketizo_sign_documents including all);
create index marketizo_sign_documents_listing on public.marketizo_sign_documents (organization_id, archived_at, updated_at desc, id);
create index marketizo_sign_templates_listing on public.marketizo_sign_templates (organization_id, archived_at, updated_at desc, id);
create table public.marketizo_sign_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  document_id uuid not null references public.marketizo_sign_documents(id),
  document_revision integer not null,
  snapshot jsonb not null,
  content_sha256 text not null check (length(content_sha256)=64),
  frozen_at timestamptz not null default clock_timestamp(),
  frozen_by text not null,
  unique(document_id, document_revision)
);
create table public.marketizo_sign_events (
  organization_id text not null,
  document_id uuid not null,
  sequence integer not null,
  action text not null,
  actor_id text not null,
  created_at timestamptz not null,
  content_sha256 text not null,
  previous_sha256 text not null,
  event_sha256 text not null,
  primary key(organization_id, document_id, sequence)
);
create table public.marketizo_sign_commands (
  organization_id text not null,
  id uuid not null,
  actor_id text not null,
  request_sha256 text not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(organization_id,id)
);

create function public.marketizo_sign_immutable() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin raise exception 'Marketizo Sign evidence is immutable'; end;
$$;
create trigger marketizo_sign_versions_immutable before update or delete on public.marketizo_sign_versions
for each row execute function public.marketizo_sign_immutable();
create trigger marketizo_sign_events_immutable before update or delete on public.marketizo_sign_events
for each row execute function public.marketizo_sign_immutable();
create trigger marketizo_sign_commands_immutable before update or delete on public.marketizo_sign_commands
for each row execute function public.marketizo_sign_immutable();

-- An ordinary CRM restore cannot touch this module. A ready version cannot be
-- reopened by a later generic service-role update. Duplicate it as a new draft.
create function public.marketizo_sign_guard() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Archive Sign documents instead of deleting'; end if;
  if new.id <> old.id or new.organization_id <> old.organization_id or new.created_by <> old.created_by then
    raise exception 'Sign identity cannot change';
  end if;
  if old.status <> 'draft' and (new.data is distinct from old.data or new.title <> old.title or new.category <> old.category or new.status = 'draft') then
    raise exception 'Frozen Sign content cannot change';
  end if;
  return new;
end;
$$;
create trigger marketizo_sign_documents_guard before update or delete on public.marketizo_sign_documents
for each row execute function public.marketizo_sign_guard();
create trigger marketizo_sign_templates_guard before update or delete on public.marketizo_sign_templates
for each row execute function public.marketizo_sign_guard();

create function public.marketizo_sign_command(p_organization text, p_actor text, p_command uuid, p_action text, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_table text;
  v_id uuid;
  v_revision integer;
  v_old record;
  v_data jsonb;
  v_previous record;
  v_request_hash text;
  v_content_hash text;
  v_event_hash text;
  v_previous_hash text;
  v_sequence integer;
  v_now timestamptz := clock_timestamp();
  v_result jsonb;
  v_names text;
  v_emails text;
  v_event jsonb;
begin
  -- Revalidate the active owner from canonical CRM state, inside the transaction.
  if p_actor is null or p_actor not in ('emp-miljan','emp-ivana') or not exists (
    select 1 from public.agency_crm_state s,
    lateral jsonb_array_elements(coalesce(s.payload->'employees','[]'::jsonb)) e
    where s.id=p_organization and e->>'id'=p_actor and coalesce(e->>'status','') <> 'Neaktivan' and coalesce(e->>'active','true') <> 'false'
  ) then return jsonb_build_object('ok',false,'status',403,'error','Nemaš dozvolu za Marketizo Sign.'); end if;
  if p_command is null or p_action is null or p_action not in ('save','freeze','archive','restore')
    or coalesce(p_payload->>'kind','') not in ('document','template') then
    return jsonb_build_object('ok',false,'status',400,'error','Nepoznata akcija.');
  end if;
  v_id := (p_payload->>'id')::uuid;
  v_revision := (p_payload->>'revision')::integer;
  if v_id is null or v_revision is null or v_revision < 0 then return jsonb_build_object('ok',false,'status',400,'error','Proveri identifikator i verziju.'); end if;
  v_request_hash := encode(sha256(convert_to(jsonb_build_object('action',p_action,'payload',p_payload)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(p_organization || ':' || p_command::text,0));
  select * into v_previous from public.marketizo_sign_commands where organization_id=p_organization and id=p_command;
  if found then
    if v_previous.actor_id<>p_actor or v_previous.request_sha256<>v_request_hash then
      return jsonb_build_object('ok',false,'status',409,'error','Identifikator pokušaja je već upotrebljen za drugu izmenu.');
    end if;
    return v_previous.result || jsonb_build_object('duplicate',true);
  end if;
  v_table := case when p_payload->>'kind'='template' then 'marketizo_sign_templates' else 'marketizo_sign_documents' end;
  -- Serialize creation and mutations for this entity, including the not-yet-existing row.
  perform pg_advisory_xact_lock(hashtextextended('marketizo-sign:' || v_id::text,1));
  if (v_table='marketizo_sign_documents' and exists(select 1 from public.marketizo_sign_templates where id=v_id))
    or (v_table='marketizo_sign_templates' and exists(select 1 from public.marketizo_sign_documents where id=v_id)) then
    return jsonb_build_object('ok',false,'status',409,'error','Identifikator dokumenta je zauzet.');
  end if;
  execute format('select * from public.%I where id=$1 and organization_id=$2 for update',v_table) into v_old using v_id,p_organization;
  if v_old.id is null and (p_action<>'save' or v_revision<>0) then return jsonb_build_object('ok',false,'status',404,'error','Dokument nije pronađen.'); end if;
  if v_old.id is not null and v_old.revision<>v_revision then return jsonb_build_object('ok',false,'status',409,'error','Dokument je u međuvremenu promenjen. Sačuvaj svoj unos kao novi nacrt ili učitaj poslednju verziju.'); end if;
  if p_action='save' then
    if v_old.id is not null and (v_old.status<>'draft' or v_old.archived_at is not null) then
      return jsonb_build_object('ok',false,'status',409,'error','Dokument je zaključan ili arhiviran. Napravi novi nacrt.');
    end if;
    v_data := p_payload->'data';
    if coalesce(jsonb_typeof(v_data),'') <> 'object' or coalesce(length(trim(v_data->>'title')),0) not between 1 and 180
      or coalesce(v_data->>'category','') not in ('clients','employees','nda','annexes','other')
      or coalesce(jsonb_typeof(v_data->'recipients'),'')<>'array'
      or coalesce(jsonb_typeof(v_data->'content'->'blocks'),'')<>'array'
      or octet_length(v_data::text)>300000
      or coalesce(v_data->>'signatureMethod','')<>'qes' or coalesce(v_data->>'governingLaw','')<>'AT'
      or coalesce(v_data->>'legalReview','')<>'pending' then
      return jsonb_build_object('ok',false,'status',400,'error','Proveri sadržaj nacrta.');
    end if;
    select coalesce(string_agg(e->>'name',' '),''),coalesce(string_agg(e->>'email',' '),'') into v_names,v_emails from jsonb_array_elements(v_data->'recipients') e;
    if v_old.id is null then
      execute format('insert into public.%I(id,organization_id,data,title,category,recipient_names,recipient_emails,search_text,status,revision,created_by,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,''draft'',1,$9,$10) on conflict(id) do nothing',v_table)
      using v_id,p_organization,v_data,v_data->>'title',v_data->>'category',v_names,v_emails,(v_data->>'title')||' '||v_names||' '||v_emails,p_actor,v_now;
      get diagnostics v_revision = row_count;
      if v_revision<>1 then return jsonb_build_object('ok',false,'status',409,'error','Identifikator dokumenta je zauzet.'); end if;
      v_revision:=1;
    else
      v_revision:=v_revision+1;
      execute format('update public.%I set data=$1,title=$2,category=$3,recipient_names=$4,recipient_emails=$5,search_text=$6,revision=$7,updated_at=$8 where id=$9 and organization_id=$10',v_table)
      using v_data,v_data->>'title',v_data->>'category',v_names,v_emails,(v_data->>'title')||' '||v_names||' '||v_emails,v_revision,v_now,v_id,p_organization;
    end if;
  elsif p_action='freeze' then
    if v_table<>'marketizo_sign_documents' or v_old.status<>'draft' or v_old.archived_at is not null then return jsonb_build_object('ok',false,'status',409,'error','Dokument nije otvoren nacrt.'); end if;
    v_data:=v_old.data;
    if jsonb_array_length(v_data->'recipients')=0 or exists(select 1 from jsonb_array_elements(v_data->'recipients') e where coalesce(trim(e->>'name'),'')='' or coalesce(trim(e->>'email'),'')='' or coalesce(trim(e->>'country'),'')='')
      or not exists(select 1 from jsonb_array_elements(v_data->'content'->'blocks') b,lateral jsonb_array_elements(b->'runs') r where trim(coalesce(r->>'text',''))<>'')
      or (v_data->'content')::text like '%{{%' then
      return jsonb_build_object('ok',false,'status',400,'error','Popuni tekst, potpisnike i promenljive šablona.');
    end if;
    v_content_hash:=encode(sha256(convert_to(v_data::text,'UTF8')),'hex');
    insert into public.marketizo_sign_versions(organization_id,document_id,document_revision,snapshot,content_sha256,frozen_at,frozen_by)
      values(p_organization,v_id,v_revision,v_data,v_content_hash,v_now,p_actor);
    v_revision:=v_revision+1;
    update public.marketizo_sign_documents set status='ready',revision=v_revision,updated_at=v_now where id=v_id and organization_id=p_organization;
  else
    v_data:=v_old.data;
    v_revision:=v_revision+1;
    execute format('update public.%I set archived_at=$1,revision=$2,updated_at=$3 where id=$4 and organization_id=$5',v_table)
      using case when p_action='archive' then v_now else null end,v_revision,v_now,v_id,p_organization;
  end if;
  v_content_hash:=encode(sha256(convert_to(v_data::text,'UTF8')),'hex');
  select coalesce(max(sequence),0)+1 into v_sequence from public.marketizo_sign_events where organization_id=p_organization and document_id=v_id;
  select event_sha256 into v_previous_hash from public.marketizo_sign_events where organization_id=p_organization and document_id=v_id order by sequence desc limit 1;
  v_previous_hash:=coalesce(v_previous_hash,repeat('0',64));
  v_event:=jsonb_build_object('organization',p_organization,'document',v_id,'kind',p_payload->>'kind','sequence',v_sequence,'action',p_action,'actor',p_actor,'at',v_now,'content_sha256',v_content_hash,'previous_sha256',v_previous_hash);
  v_event_hash:=encode(sha256(convert_to(v_event::text,'UTF8')),'hex');
  insert into public.marketizo_sign_events values(p_organization,v_id,v_sequence,p_action,p_actor,v_now,v_content_hash,v_previous_hash,v_event_hash);
  v_result:=jsonb_build_object('ok',true,'id',v_id,'revision',v_revision,'contentSha256',v_content_hash);
  insert into public.marketizo_sign_commands(organization_id,id,actor_id,request_sha256,result) values(p_organization,p_command,p_actor,v_request_hash,v_result);
  return v_result;
end;
$$;

alter table public.marketizo_sign_documents enable row level security;
alter table public.marketizo_sign_templates enable row level security;
alter table public.marketizo_sign_versions enable row level security;
alter table public.marketizo_sign_events enable row level security;
alter table public.marketizo_sign_commands enable row level security;
revoke all on public.marketizo_sign_documents,public.marketizo_sign_templates,public.marketizo_sign_versions,public.marketizo_sign_events,public.marketizo_sign_commands from public,anon,authenticated;
grant select,insert,update on public.marketizo_sign_documents,public.marketizo_sign_templates to service_role;
grant select,insert on public.marketizo_sign_versions,public.marketizo_sign_events,public.marketizo_sign_commands to service_role;
-- Explicit service policies also work on a test role without BYPASSRLS.
create policy sign_documents_service on public.marketizo_sign_documents for all to service_role using(true) with check(true);
create policy sign_templates_service on public.marketizo_sign_templates for all to service_role using(true) with check(true);
create policy sign_versions_service on public.marketizo_sign_versions for all to service_role using(true) with check(true);
create policy sign_events_service on public.marketizo_sign_events for all to service_role using(true) with check(true);
create policy sign_commands_service on public.marketizo_sign_commands for all to service_role using(true) with check(true);
revoke all on function public.marketizo_sign_command(text,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketizo_sign_command(text,text,uuid,text,jsonb) to service_role;
revoke all on function public.marketizo_sign_guard(),public.marketizo_sign_immutable() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
