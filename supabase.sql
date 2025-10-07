-- votes table (one per unit per poll)
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null,
  unit text not null,
  name text not null,
  option_id text not null check (option_id in ('A','B','C')),
  created_at timestamptz not null default now()
);
create unique index if not exists votes_unique_per_unit on public.votes (poll_id, unit);

-- pins table (unique link + PIN per unit)
create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null,
  unit text not null,
  pin text not null,
  token text not null unique,
  used_at timestamptz,
  used_option text
);
create unique index if not exists pins_unique_unit_per_poll on public.pins (poll_id, unit);

alter table public.votes enable row level security;
alter table public.pins  enable row level security;

-- Separate policies (avoid WITH CHECK on SELECT)
create policy if not exists "allow select anon votes" on public.votes for select using (true);
create policy if not exists "allow insert anon votes" on public.votes for insert with check (true);
create policy if not exists "allow select anon pins" on public.pins for select using (true);
create policy if not exists "allow insert update anon pins" on public.pins for all using (true) with check (true);
