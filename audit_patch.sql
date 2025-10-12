create table if not exists public.vote_audit (
  id bigserial primary key,
  action text not null,
  voter_name text,
  unit_id text,
  ip text,
  user_agent text,
  details jsonb,
  created_at timestamptz default now()
);

alter table public.vote_audit add column if not exists voter_name text;
create index if not exists idx_vote_audit_created_at on public.vote_audit(created_at);
alter table public.vote_audit enable row level security;
drop policy if exists allow_all_audit on public.vote_audit;
create policy allow_all_audit on public.vote_audit for all using (true) with check (true);
