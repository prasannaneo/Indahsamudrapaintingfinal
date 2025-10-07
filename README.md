
# Admin CSV Upload + QR Messaging

- New **Residents Upload (CSV)** panel in `/#admin`.
- Upload `unit_id, owner_name, email, whatsapp` via CSV; they are **upserted** into `residents` (on conflict `unit_id`).

## New API
- `POST /api/residents-bulk-upsert` — body: `{ rows: [{unit_id, owner_name, email, whatsapp}, ...] }`

## Env (Vercel → Settings → Environment Variables)
Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_POLL_ID`
- `VITE_ADMIN_SETUP_CODE`

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY` (required for bulk upsert)
- `PUBLIC_SITE_URL`
- (optional) `RESEND_API_KEY`, `RESEND_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`

Deploy, then visit `/#admin` → **Residents Upload (CSV)**.


### Env fallback note
The serverless functions accept either `SUPABASE_URL` **or** `VITE_SUPABASE_URL`. Set **one** of them plus `SUPABASE_SERVICE_ROLE_KEY`.
