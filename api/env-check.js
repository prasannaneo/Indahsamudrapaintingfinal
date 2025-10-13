export default function handler(req, res) {
  const mask = (v) => Boolean(v && String(v).length);
  res.status(200).json({
    SUPABASE_URL: mask(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE),
    PUBLIC_SITE_URL: mask(process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL),
    ADMIN_RESET_CODE: mask(process.env.ADMIN_RESET_CODE || process.env.VITE_ADMIN_SETUP_CODE),
  });
}
