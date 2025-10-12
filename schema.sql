-- Run this in Supabase SQL Editor.

create table if not exists public.residents (
  unit_id text primary key,
  owner_name text
);

create table if not exists public.votes (
  id bigserial primary key,
  unit_id text not null,
  option text not null check (option in ('A','B','C')),
  created_at timestamptz default now()
);

create table if not exists public.vote_audit (
  id bigserial primary key,
  action text not null, -- 'vote','reset','export','login','setup'
  voter_name text,
  unit_id text,
  ip text,
  user_agent text,
  details jsonb,
  created_at timestamptz default now()
);

-- Admin single-row table
create table if not exists public.admin_settings (
  id boolean primary key default true, -- single row table (always TRUE)
  username text not null,
  password_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.touch_admin_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_admin_updated_at on public.admin_settings;
create trigger trg_touch_admin_updated_at
before update on public.admin_settings
for each row execute procedure public.touch_admin_updated_at();

-- Helpful indexes
create index if not exists idx_votes_unit on public.votes(unit_id);
create index if not exists idx_votes_option on public.votes(option);
create index if not exists idx_vote_audit_created on public.vote_audit(created_at);

-- Ensure voter_name exists (bug fix for missing column)
alter table public.vote_audit add column if not exists voter_name text;

-- RLS (adjust as you need; here we keep it open for anon for demo—tighten for production)
alter table public.residents enable row level security;
alter table public.votes enable row level security;
alter table public.vote_audit enable row level security;
alter table public.admin_settings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='residents' and policyname='allow_all_residents') then
    create policy allow_all_residents on public.residents for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='votes' and policyname='allow_all_votes') then
    create policy allow_all_votes on public.votes for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='vote_audit' and policyname='allow_all_audit') then
    create policy allow_all_audit on public.vote_audit for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='admin_settings' and policyname='allow_all_admin') then
    create policy allow_all_admin on public.admin_settings for all using (true) with check (true);
  end if;
end $$;
