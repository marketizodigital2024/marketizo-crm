-- Tabela u kojoj se cuva cela analiza. Klijent pre uplate dobija samo pregled,
-- a prioriteti, ocene i ideje ostaju ovde dok Stripe ne potvrdi uplatu.
create table if not exists public.marketizo_audits (
  id text primary key,
  audit jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  lead jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketizo_audits enable row level security;

-- Pristup ima samo servisni kljuc koji koristi Vercel. Iz browsera se ne moze citati.
drop policy if exists "Service role reads audits" on public.marketizo_audits;
drop policy if exists "Service role writes audits" on public.marketizo_audits;

create policy "Service role reads audits"
on public.marketizo_audits
for select
to service_role
using (true);

create policy "Service role writes audits"
on public.marketizo_audits
for all
to service_role
using (true)
with check (true);

create index if not exists marketizo_audits_created_at_idx on public.marketizo_audits (created_at desc);
