import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import twilio from "twilio";

export function getEnv() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || "",
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "qr",
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",
    RESEND_FROM: process.env.RESEND_FROM || "",
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || "",
  };
}
export function getSupabaseServer(){
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL/VITE_SUPABASE_URL is required");
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
export function assertPublicSiteUrl(){
  const { PUBLIC_SITE_URL } = getEnv();
  if (!PUBLIC_SITE_URL) throw new Error("PUBLIC_SITE_URL not set");
  return PUBLIC_SITE_URL;
}
export function getResend(){
  const { RESEND_API_KEY, RESEND_FROM } = getEnv();
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  if (!RESEND_FROM) throw new Error("RESEND_FROM not set");
  const resend = new Resend(RESEND_API_KEY);
  return { resend, from: RESEND_FROM };
}
export function getTwilio(){
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = getEnv();
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw new Error("Twilio WhatsApp env vars missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)");
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return { client, from: TWILIO_WHATSAPP_FROM };
}
export async function ensureBucket(sb){
  const { SUPABASE_STORAGE_BUCKET } = getEnv();
  try {
    const { data: list } = await sb.storage.listBuckets();
    if (!list?.find(b => b.name === SUPABASE_STORAGE_BUCKET)) {
      await sb.storage.createBucket(SUPABASE_STORAGE_BUCKET, { public: true });
    }
  } catch {}
  return SUPABASE_STORAGE_BUCKET;
}