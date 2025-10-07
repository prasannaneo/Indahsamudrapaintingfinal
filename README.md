
# QR Messaging (Email + WhatsApp)

## What this adds
- **Send QR by Email**: generates fresh, single-use tokens, renders QR PNGs, uploads to Supabase Storage, emails residents the **QR image** (and link text fallback).
- **Send QR by WhatsApp**: same QR PNG sent as WhatsApp **media** via Twilio (you must have a WhatsApp-enabled sender).

## New API functions
- `/api/send-qr-email` (Resend + Supabase Storage)
- `/api/send-qr-whatsapp` (Twilio WhatsApp + Supabase Storage)
- `/api/generate-qr-pack` (printable PDF for mailboxes)

## Environment variables
Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_POLL_ID`
- `VITE_ADMIN_SETUP_CODE`

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM` e.g. `Indah Samudra <vote@yourdomain>`
- `SUPABASE_STORAGE_BUCKET` (default: `qr`)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` e.g. `whatsapp:+14155238886` (or your approved WhatsApp Business sender)

## Data assumptions
- `residents(unit_id, owner_name, email, whatsapp)`
- Only **non-voting** units get a new token; old unused tokens are **expired** on send.

## Notes
- WhatsApp numbers must be **E.164** format, e.g. `+6591234567`. You can store as `+65...` (function prefixes `whatsapp:` automatically).
- Supabase Storage bucket is created **if missing** and set to public for serving QR images.
- Tokens are stored **hashed** only; the raw token is embedded in the QR and link.
