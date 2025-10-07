# Indah Samudra – Condo Painting Voting (Complete)

## Features
- Public voting via **one-time QR token** (one vote per unit).
- Admin login/setup + CSV/XLSX upload for residents.
- Generate **QR Pack (PDF)** for printing.
- Email QR via **Resend** (free tier).
- WhatsApp QR via **Meta Cloud API** (optional).
- **Reset** button to clear votes & tokens for current poll.
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

## Endpoints (serverless functions)
- `POST /api/residents-bulk-upsert`  ← Admin XLS/CSV upload target
- `POST /api/generate-qr-pack`       ← Returns a PDF
- `POST /api/send-qr-email`          ← Sends email (Resend)
- `POST /api/send-qr-whatsapp`       ← WhatsApp via Meta Cloud API
- `POST /api/reset-poll`             ← Clears votes+tokens (requires ADMIN_RESET_CODE)
- `GET  /api/hello`                  ← Health check

## Env notes
- **PUBLIC_SITE_URL** must be your production URL (e.g., `https://indahsamudra.vercel.app`).
- **VITE_HIDE_ADMIN_LINKS**=`true` hides admin link on public page.
- **RESEND_FROM** must be on a **verified domain in Resend**.
- WhatsApp uses Meta Cloud API: set `META_WA_*` vars and use an approved template.

## Images
Replace the placeholders:
```
public/images/design-a.jpg
public/images/design-b.jpg
public/images/design-c.jpg
```
