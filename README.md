# Indah Samudra – Condo Painting Voting (Complete v4)

Public voting via one-time QR token (one vote per unit). Admin upload residents (CSV), live results, QR pack PDF, email/WhatsApp send, resets.

## Deploy
1) Supabase → SQL: run `migrations.sql`, then `notify pgrst, 'reload schema';`
2) Import to Vercel (root=repo root). Set envs from `.env.sample`. Redeploy.
3) Visit `/#admin-setup` to create first admin (uses `VITE_ADMIN_SETUP_CODE`).
4) Upload residents CSV in the Admin page, then Generate QR (PDF) or send via Email/WhatsApp.

Replace placeholder images at:
public/images/design-a.jpg, design-b.jpg, design-c.jpg
