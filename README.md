# Indah Samudra Voting App (Baseline Restored)

This restores the **Code Base 1** features and fixes:
- Hash routes: `#/` (Vote), `#/admin-login`, `#/admin-setup`, `#/admin`
- Hidden admin links by default (`VITE_HIDE_ADMIN_LINKS=true`)
- Votes stored in `votes` table
- Audit logs (time, IP*, User-Agent, voter_name) stored in `vote_audit` table
- Export CSV for votes / audit / residents
- Reset votes button
- Residents CSV can be uploaded directly into Supabase (see `schema.sql`)
- Bug fix: ensure `vote_audit.voter_name` column exists
- UI: Option A/B/C aligned via `OptionCard`

> *IP collection*: set `VITE_IP_ENDPOINT` to an endpoint that returns your public IP in plain text (e.g. a tiny Cloudflare Worker or ipify). If unset, IP will be recorded as `unknown` to avoid external calls.

## Setup

1. Copy `.env.sample` to `.env` and fill Supabase keys.
2. Run the SQL in `schema.sql` inside Supabase.
3. `npm i` then `npm run dev`.

## Admin

- First, visit `#/admin-setup` to set username/password (stored in `admin_settings` table).
- Then login via `#/admin-login`. A session flag in `sessionStorage` gates the dashboard.
- Dashboard provides tally, CSV exports, and reset.

## Notes

- Keep RLS policies tight for production; current policies are open for demo.
- Replace the simple client-side hash function with a server-side hash in production.
