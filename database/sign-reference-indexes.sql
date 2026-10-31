-- Add indexes only; no existing record is rewritten.
begin;
set local lock_timeout='3s';
create index if not exists marketizo_sign_completed_parties_request_idx on public.marketizo_sign_completed_parties(request_id);
create index if not exists marketizo_sign_requests_version_idx on public.marketizo_sign_requests(version_id);
create index if not exists marketizo_sign_sessions_party_idx on public.marketizo_sign_sessions(party_id);
commit;
