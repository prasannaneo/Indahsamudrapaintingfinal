create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null,
  pin text not null,
  unit text,
  name text,
  option_id text not null check (option_id in ('A','B','C')),
  created_at timestamptz not null default now()
);
create unique index if not exists votes_unique_per_pin on public.votes (poll_id, pin);

create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null,
  unit text,
  owner_name text,
  pin text not null unique,
  token text not null unique,
  used_at timestamptz,
  used_option text
);
create unique index if not exists pins_unique_unit_per_poll on public.pins (poll_id, unit);

create table if not exists public.admins (
  email text primary key,
  pass_sha256 text not null,
  created_at timestamptz not null default now()
);

alter table public.votes  enable row level security;
alter table public.pins   enable row level security;
alter table public.admins enable row level security;

create policy if not exists "votes_select_anon" on public.votes  for select using (true);
create policy if not exists "votes_insert_anon" on public.votes  for insert with check (true);
create policy if not exists "pins_select_anon"  on public.pins   for select using (true);
create policy if not exists "pins_all_anon"     on public.pins   for all using (true) with check (true);
create policy if not exists "admins_select_anon" on public.admins for select using (true);
create policy if not exists "admins_insert_anon" on public.admins for insert with check (true);
