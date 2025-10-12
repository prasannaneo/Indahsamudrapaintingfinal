-- Run this in Supabase SQL if deletes are blocked by RLS
set search_path = public;
alter table if exists residents enable row level security;
drop policy if exists allow_delete_residents on residents;
create policy allow_delete_residents on residents
  for delete using (true);
-- Optionally keep your existing read/insert/update policies alongside this.
-- If API cache is stale:
NOTIFY pgrst, 'reload schema';
