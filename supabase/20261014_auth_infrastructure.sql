begin;

create table if not exists public.crm_login_limits (
  key_hash text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table public.crm_login_limits enable row level security;
create index if not exists crm_login_limits_window on public.crm_login_limits(window_start);
revoke all on public.crm_login_limits from anon, authenticated;
grant all on public.crm_login_limits to service_role;
drop policy if exists crm_login_limits_service on public.crm_login_limits;
create policy crm_login_limits_service on public.crm_login_limits for all to service_role using (true) with check (true);

create or replace function public.marketizo_allow_login_attempt(p_key_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from public.crm_login_limits where key_hash in
    (select key_hash from public.crm_login_limits where window_start < clock_timestamp()-interval '7 days' order by window_start limit 200);
  insert into public.crm_login_limits(key_hash,window_start,attempts)
  values(p_key_hash,clock_timestamp(),1)
  on conflict(key_hash) do update set
    attempts=case when public.crm_login_limits.window_start < clock_timestamp()-interval '15 minutes' then 1 else least(255,public.crm_login_limits.attempts+1) end,
    window_start=case when public.crm_login_limits.window_start < clock_timestamp()-interval '15 minutes' then clock_timestamp() else public.crm_login_limits.window_start end
  returning attempts into n;
  return n <= 30;
end $$;
revoke all on function public.marketizo_allow_login_attempt(text) from public, anon, authenticated;
grant execute on function public.marketizo_allow_login_attempt(text) to service_role;

create or replace function public.marketizo_hash_password(p_password text)
returns text language sql volatile set search_path = '' as $$
  select case when coalesce(p_password,'')='' or p_password like 'crm$bcrypt-sha256$v1$%'
    then coalesce(p_password,'')
    else 'crm$bcrypt-sha256$v1$' || extensions.crypt(encode(extensions.digest(p_password,'sha256'),'hex'),extensions.gen_salt('bf',10)) end;
$$;
revoke all on function public.marketizo_hash_password(text) from public, anon, authenticated;
grant execute on function public.marketizo_hash_password(text) to service_role;

create or replace function public.marketizo_hash_crm_payload(p_payload jsonb)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare result jsonb := p_payload;
begin
  if result ? 'employees' then
    result=jsonb_set(result,'{employees}',coalesce((select jsonb_agg(case when e ? 'password' then jsonb_set(e,'{password}',to_jsonb(public.marketizo_hash_password(e->>'password'))) else e end order by ordinal)
      from jsonb_array_elements(result->'employees') with ordinality t(e,ordinal)),'[]'::jsonb));
  end if;
  if result ? 'clients' then
    result=jsonb_set(result,'{clients}',coalesce((select jsonb_agg(case when c ? 'loginPassword' then jsonb_set(c,'{loginPassword}',to_jsonb(public.marketizo_hash_password(c->>'loginPassword'))) else c end order by ordinal)
      from jsonb_array_elements(result->'clients') with ordinality t(c,ordinal)),'[]'::jsonb));
  end if;
  return result;
end $$;
revoke all on function public.marketizo_hash_crm_payload(jsonb) from public, anon, authenticated;
grant execute on function public.marketizo_hash_crm_payload(jsonb) to service_role;

-- Auth rows need refreshing only when employee profiles actually change.
create or replace function public.marketizo_sync_employee_auth()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id='marketizo-main' and (tg_op='INSERT' or new.payload->'employees' is distinct from old.payload->'employees') then
    insert into public.agency_crm_employee_auth(id,email,password,employee_data,updated_at)
    select e->>'id',lower(btrim(e->>'email')),coalesce(e->>'password',''),e,new.updated_at
    from jsonb_array_elements(coalesce(new.payload->'employees','[]'::jsonb)) e
    where coalesce(e->>'id','')<>'' and coalesce(e->>'email','')<>''
    on conflict(id) do update set email=excluded.email,password=excluded.password,employee_data=excluded.employee_data,updated_at=excluded.updated_at;
    delete from public.agency_crm_employee_auth a where not exists
      (select 1 from jsonb_array_elements(coalesce(new.payload->'employees','[]'::jsonb)) e where e->>'id'=a.id and coalesce(e->>'email','')<>'');
  end if;
  return new;
end $$;
revoke all on function public.marketizo_sync_employee_auth() from public, anon, authenticated;
grant execute on function public.marketizo_sync_employee_auth() to service_role;

-- Return a small employee/client projection across the database network boundary.
create or replace function public.marketizo_read_session_state(p_role text,p_employee_id text default null,p_client_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare source public.agency_crm_state%rowtype; actor jsonb; result jsonb; visible_ids text[];
begin
  select * into source from public.agency_crm_state where id='marketizo-main';
  if source.id is null then return null; end if;
  if p_role='client' then
    select c into actor from jsonb_array_elements(coalesce(source.payload->'clients','[]'::jsonb)) c where c->>'id'=p_client_id and coalesce(c->>'status','')<>'Arhiviran';
    if actor is null then return null; end if;
    result=jsonb_build_object('clients',jsonb_build_array(actor),
      'leads',coalesce((select jsonb_agg(l) from jsonb_array_elements(coalesce(source.payload->'leads','[]'::jsonb)) l where l->>'clientId'=p_client_id or l->>'client'=actor->>'name'),'[]'::jsonb),
      'teamMembers',coalesce((select jsonb_agg(t) from jsonb_array_elements(coalesce(source.payload->'teamMembers','[]'::jsonb)) t where t->>'clientId'=p_client_id or t->>'client'=actor->>'name'),'[]'::jsonb));
  else
    select e into actor from jsonb_array_elements(coalesce(source.payload->'employees','[]'::jsonb)) e where e->>'id'=p_employee_id and coalesce(e->>'status','')<>'Neaktivan' and coalesce(e->>'active','true')<>'false';
    if actor is null then return null; end if;
    if p_role='full-admin' and p_employee_id in ('emp-miljan','emp-ivana') then result=source.payload;
    elsif p_role='operational-admin' and actor->>'isOperationalAdmin'='true' then result=source.payload;
    elsif p_role='employee' then
      select array_agg(e->>'id') into visible_ids from jsonb_array_elements(source.payload->'employees') e
        where e->>'id'=p_employee_id or (actor->>'isLeader'='true' and (p_employee_id in ('emp-miljan','emp-ivana') or e->>'leaderId'=p_employee_id));
      result=jsonb_set(source.payload,'{clients}',coalesce((select jsonb_agg(jsonb_build_object('id',c->>'id','name',c->>'name','status',c->>'status')) from jsonb_array_elements(coalesce(source.payload->'clients','[]'::jsonb)) c),'[]'::jsonb));
      result=jsonb_set(result,'{employeeWorkLogs}',coalesce((select jsonb_agg(l) from jsonb_array_elements(coalesce(source.payload->'employeeWorkLogs','[]'::jsonb)) l where l->>'employeeId'=any(visible_ids)),'[]'::jsonb));
    else return null; end if;
  end if;
  return jsonb_build_object('payload',result,'updated_at',source.updated_at);
end $$;
revoke all on function public.marketizo_read_session_state(text,text,text) from public, anon, authenticated;
grant execute on function public.marketizo_read_session_state(text,text,text) to service_role;

commit;
