# Indah Samudra – Condo Painting Voting (Complete, with Reset Residents)

## Features
- Public voting via **one-time QR token** (one vote per unit).
- Admin: login/setup, upload residents (Excel/CSV), live results, CSV export via browser.
- Generate **QR Pack (PDF)**, send **Email QR** (Resend), send **WhatsApp QR** (Meta Cloud API).
- **Reset All Votes** and **Reset Residents (roster)** buttons.
- Excel template embedded at `/templates/residents_template.xlsx`.

## Deploy (Vercel)
1. Create a new project from this repo. Root directory = repo root (contains `/api`).
2. Add **Environment Variables** (Production) as in `.env.sample`.
3. Redeploy → open Production URL.
4. Visit `/#admin-setup` to create first admin (code = `VITE_ADMIN_SETUP_CODE`).

## Supabase (run once)
Paste `migrations.sql` into Supabase SQL Editor, run, then:
```sql
notify pgrst, 'reload schema';
```

## API routes
- `POST /api/residents-bulk-upsert`
- `POST /api/generate-qr-pack`
- `POST /api/send-qr-email`
- `POST /api/send-qr-whatsapp`
- `POST /api/reset-poll`
- `POST /api/reset-residents`
- `GET  /api/hello`

## Env notes
- **PUBLIC_SITE_URL** must be the Production domain (e.g., `https://indahsamudrapaintingfinal.vercel.app`).
- **VITE_HIDE_ADMIN_LINKS**=`true` hides admin link on public page.
- **RESEND_FROM** must be on a verified domain in Resend.
- WhatsApp uses Meta Cloud API: set `META_WA_*` vars and use an approved template.
- You can check env presence at `/api/env-check` (booleans only).

## Images
Replace placeholders at:
```
public/images/design-a.jpg
public/images/design-b.jpg
public/images/design-c.jpg
```
