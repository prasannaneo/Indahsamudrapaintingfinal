# Indah Samudra – Voting (PIN-only) with Admin Login & Dashboard

Routes:
- `/#admin-login` → admin login
- `/#admin` → admin dashboard
- `/#admin-setup` → create admins (requires setup code)

Env:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_SETUP_CODE`

Run `supabase.sql` in Supabase to create tables & policies.
