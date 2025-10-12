# Indah Samudra Voting App — Baseline Restored + Audit
- Hash routes: `#/`, `#/admin-login`, `#/admin-setup`, `#/admin`
- Admin links hidden by `VITE_HIDE_ADMIN_LINKS=true`
- Option A/B/C cards with images: put `public/images/optionA.jpg` etc
- Vote inserts into `votes` and logs audit to `vote_audit` (IP + UA)
- Admin Dashboard: tally, CSV exports (votes/audit/residents), Reset, Generate QR (14 days), Print to PDF
- SQL in `schema.sql` creates required tables (including `voter_name` in audit)

## Run
1. Run `schema.sql` in Supabase.
2. Copy `.env.sample` to `.env` and fill keys. Optionally set `VITE_IP_ENDPOINT`.
3. `npm i && npm run dev`
