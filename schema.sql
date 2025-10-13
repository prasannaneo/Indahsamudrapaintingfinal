create schema if not exists public;
set search_path = public;

create table if not exists residents (
  unit_id text primary key,
  owner_name text
);

create table if not exists votes (
  id uuid default gen_random_uuid() primary key,
  unit_id text not null,
  option text not null check (option in ('A','B','C')),
  created_at timestamptz default now()
);

create table if not exists vote_audit (
  id bigserial primary key,
  action text not null,
  voter_name text,
  unit_id text,
  ip text,
  user_agent text,
  details jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_vote_audit_created on vote_audit(created_at);

create table if not exists admin_settings (
  id boolean primary key default true,
  username text not null,
  password_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function touch_admin_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;
drop trigger if exists trg_touch_admin_updated_at on admin_settings;
create trigger trg_touch_admin_updated_at
before update on admin_settings
for each row execute procedure touch_admin_updated_at();

create table if not exists qr_tokens (
  token text primary key,
  unit_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_qr_tokens_expires_at on qr_tokens(expires_at);

-- RLS (open)
alter table residents enable row level security;
alter table votes enable row level security;
alter table vote_audit enable row level security;
alter table admin_settings enable row level security;
alter table qr_tokens enable row level security;

drop policy if exists allow_all_residents on residents;
create policy allow_all_residents on residents for all using (true) with check (true);
drop policy if exists allow_all_votes on votes;
create policy allow_all_votes on votes for all using (true) with check (true);
drop policy if exists allow_all_audit on vote_audit;
create policy allow_all_audit on vote_audit for all using (true) with check (true);
drop policy if exists allow_all_admin on admin_settings;
create policy allow_all_admin on admin_settings for all using (true) with check (true);
drop policy if exists allow_all_qr on qr_tokens;
create policy allow_all_qr on qr_tokens for all using (true) with check (true);

NOTIFY pgrst, 'reload schema';
