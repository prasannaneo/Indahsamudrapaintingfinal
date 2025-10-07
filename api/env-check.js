export default function handler(req, res){
  res.status(200).json({
    SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    PUBLIC_SITE_URL: !!process.env.PUBLIC_SITE_URL,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    RESEND_FROM: !!process.env.RESEND_FROM,
    META_WA_TOKEN: !!process.env.META_WA_TOKEN,
    META_WA_PHONE_NUMBER_ID: !!process.env.META_WA_PHONE_NUMBER_ID,
    META_WA_TEMPLATE: !!process.env.META_WA_TEMPLATE,
    ADMIN_RESET_CODE: !!process.env.ADMIN_RESET_CODE,
  });
}
