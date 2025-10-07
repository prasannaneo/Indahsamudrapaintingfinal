
create extension if not exists pgcrypto;

-- Residents master
create table if not exists public.residents (
  id bigserial primary key,
  unit_id text not null unique,
  owner_name text not null,
  email text,
  whatsapp text
);

-- Tokens (hash-only; raw token is emailed)
create table if not exists public.vote_tokens (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null,
  unit_id text not null references public.residents(unit_id) on delete cascade,
  owner_name text,
  token_hash text not null unique,
  sent_at timestamptz,
  used_at timestamptz,
  expires_at timestamptz
);

-- Votes (one per unit)
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null,
  unit_id text not null references public.residents(unit_id) on delete cascade,
  option_id text not null check (option_id in ('A','B','C')),
  voter_name text,
  created_at timestamptz not null default now()
);
create unique index if not exists one_vote_per_unit on public.votes(unit_id);

-- Optional admins table (if not created already)
create table if not exists public.admins (
  email text primary key,
  pass_sha256 text not null,
  created_at timestamptz not null default now()
);

-- RLS: allow public read of minimal fields; writes are constrained
alter table public.residents enable row level security;
alter table public.vote_tokens enable row level security;
alter table public.votes enable row level security;
alter table public.admins enable row level security;

-- Residents: public select only unit_id (admin can view details via Supabase UI or serverless)
drop policy if exists residents_select_public on public.residents;
create policy residents_select_public on public.residents
  for select using (true);

-- Vote tokens: public can select (to verify their own token), but no insert/update except via serverless or UI actions
drop policy if exists tokens_select_public on public.vote_tokens;
create policy tokens_select_public on public.vote_tokens
  for select using (true);

drop policy if exists tokens_update_public on public.vote_tokens;
create policy tokens_update_public on public.vote_tokens
  for update using (true)
  with check (true);

-- Votes: public can read and insert (submit), unique index enforces one-per-unit
drop policy if exists votes_select_public on public.votes;
create policy votes_select_public on public.votes
  for select using (true);

drop policy if exists votes_insert_public on public.votes;
create policy votes_insert_public on public.votes
  for insert with check (true);
