
export default function handler(req,res){
  const ok=v=>Boolean(v&&String(v).length);
  res.status(200).json({
    SUPABASE_URL: ok(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: ok(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE),
    PUBLIC_SITE_URL: ok(process.env.PUBLIC_SITE_URL||process.env.VITE_PUBLIC_SITE_URL),
    ADMIN_RESET_CODE: ok(process.env.ADMIN_RESET_CODE||process.env.VITE_ADMIN_SETUP_CODE),
  })
}
