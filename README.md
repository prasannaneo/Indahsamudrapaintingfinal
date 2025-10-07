# Indah Samudra – Env-Ready Voting App

1) Create a new GitHub repo with these files and import into Vercel.
2) Add env vars from `.env.sample` into Vercel (Production & Preview), then redeploy.
3) Create Supabase tables via the SQL I provided earlier, then `notify pgrst, 'reload schema';`.
4) Visit:
   - `/` – public voting
   - `/#admin-setup` – create first admin
   - `/#admin` – upload CSV, generate QR pack, send email/WhatsApp.

Serverless env handling is centralized in `api/_config.js`.
