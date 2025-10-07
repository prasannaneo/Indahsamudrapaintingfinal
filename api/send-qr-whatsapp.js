
import crypto from "crypto";
import QRCode from "qrcode";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) throw new Error("SUPABASE_URL/VITE_SUPABASE_URL is required");
if (!SUPABASE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);


async function ensureBucket(sb, bucket){
  try{
    const { data: list } = await sb.storage.listBuckets();
    if (!list?.find(b => b.name === bucket)){
      await sb.storage.createBucket(bucket, { public: true });
    }
  }catch(e){ /* ignore if already exists */ }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { pollId } = req.body || {};
  try {
    const site = process.env.PUBLIC_SITE_URL;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "qr";

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const waFrom     = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+14155238886'
    if (!accountSid || !authToken || !waFrom) return res.status(500).send("Twilio WhatsApp env vars missing");
    const client = twilio(accountSid, authToken);

    if (!site) return res.status(500).send("PUBLIC_SITE_URL not set");
    await ensureBucket(sb, bucket);

    const { data: residents, error: rerr } = await sb
      .from("residents")
      .select("unit_id, owner_name, whatsapp");
    if (rerr) throw rerr;

    const { data: voted } = await sb.from("votes").select("unit_id").eq("poll_id", pollId);
    const votedSet = new Set((voted||[]).map(v => v.unit_id));

    let total = 0, sent = 0;
    for (const r of residents) {
      total++;
      if (!r.whatsapp) continue;
      if (votedSet.has(r.unit_id)) continue;

      // expire old tokens
      await sb.from("vote_tokens").update({ expires_at: new Date().toISOString() })
        .eq("poll_id", pollId).eq("unit_id", r.unit_id).is("used_at", null);

      // new token
      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();
      const ins = await sb.from("vote_tokens").insert({
        poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires
      }).select("id").single();
      if (ins.error) throw ins.error;

      const link = `${site}/?t=${raw}`;
      const png = await QRCode.toBuffer(link, { width: 700, margin: 2 });
      const path = `${pollId}/${r.unit_id}.png`;
      const up = await sb.storage.from(bucket).upload(path, png, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      const pub = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;

      // send WhatsApp with media
      const to = r.whatsapp.startsWith("whatsapp:") ? r.whatsapp : `whatsapp:${r.whatsapp}`;
      await client.messages.create({
        from: waFrom,
        to,
        body: `Hi ${r.owner_name}, scan this QR to vote for the condo painting (one-time, expires in 30 days). If you can't scan, open: ${link}`,
        mediaUrl: [pub]
      });

      await sb.from("vote_tokens").update({ sent_at: new Date().toISOString() }).eq("id", ins.data.id);
      sent++;
    }

    return res.status(200).json({ total, sent });
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.message || "WhatsApp QR failed");
  }
}
