
# Indah Samudra – Full Vite App (QR Email + WhatsApp + PDF)

This is a complete Vite + React app ready for Vercel with three serverless endpoints:
- `/api/generate-qr-pack.js` – printable PDF of per-unit QRs
- `/api/send-qr-email.js` – email QR images via Resend
- `/api/send-qr-whatsapp.js` – WhatsApp QR images via Twilio

## Deploy (Vercel)
1. Create a **new repo** on GitHub and push these files.
2. In Vercel: **New Project → Import** that repo (Framework auto-detect = Vite).
3. Set Environment Variables (Project → Settings → Environment Variables):

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_POLL_ID` (e.g., `indah-samudra-painting-2025`)
- `VITE_ADMIN_SETUP_CODE`

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL` (e.g., `https://<your-project>.vercel.app`)
- `SUPABASE_STORAGE_BUCKET` (default `qr`)
- `RESEND_API_KEY`
- `RESEND_FROM` (e.g., `Indah Samudra <vote@yourdomain>`)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`

4. **Deploy** and visit:
   - `/` – public app
   - `/#admin-setup` – create first admin
   - `/#admin` – dashboard (Generate QR Pack, Email QR, WhatsApp QR)

## Common 404 fixes
- If root `/` shows Vercel "NOT_FOUND": check **Deployments** — you must have a **Production** deployment on the main branch.
- If `/api/...` returns 404: ensure your repo has an **`/api` folder at the root**, and you deployed that branch.
- After adding functions, **push a new commit** or click **Redeploy** in Vercel.
