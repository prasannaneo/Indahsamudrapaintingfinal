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


## Option Images
These zips include your three uploaded proposal renders mapped as:
- A → public/images/optionA.jpg
- B → public/images/optionB.jpg
- C → public/images/optionC.jpg
Replace them anytime to update the voting thumbnails.


## v4 additions
- Reset Residents button (deletes all rows in `residents`)
- Generate QR now creates a `qr_tokens.pdf` with QR codes and unit labels
- Progress bar shown during QR PDF generation
- Optional `VITE_QR_URL_PREFIX` to control the URL encoded in each QR.


## v5.2: QR opens URL + auto-fill
- QR now encodes a full URL like: `https://yourdomain/#/?unit_id=A-12-05&name=Alice%20Tan&token=...`
- Vote page auto-fills Unit ID and Name from those params.
- Configure the domain via `VITE_QR_URL_PREFIX` (must be a full URL to your deployed site). If not set, it falls back to current origin.
