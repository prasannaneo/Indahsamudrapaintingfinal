# Indah Samudra Condo Painting – Voting (One-time PIN)

Deploy in minutes via Vercel **Upload** (no GitHub needed).

## Deploy steps
1) Go to https://vercel.com/new → **Upload** → drop this folder.
2) Set env vars when asked:
   - VITE_SUPABASE_URL = your Supabase project URL
   - VITE_SUPABASE_ANON_KEY = your Supabase anon public key
3) Click **Deploy**.
4) In Supabase → **SQL** → run `supabase.sql` (creates tables + policies).

## After deploy
- Admin → generate 220 unique links + PINs (CSV) → send QR or link to residents.
