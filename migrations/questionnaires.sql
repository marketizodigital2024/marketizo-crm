-- Additive module storage. Does not read or write employee work records or CRM state.
create table if not exists public.marketizo_questionnaires (
 namespace text not null check (namespace in ('preview','production')),
 id text not null,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(namespace,id)
);
alter table public.marketizo_questionnaires enable row level security;
revoke all on public.marketizo_questionnaires from public, anon, authenticated;
grant select, insert, update on public.marketizo_questionnaires to service_role;
