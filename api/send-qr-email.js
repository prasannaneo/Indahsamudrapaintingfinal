
import crypto from "crypto";
import QRCode from "qrcode";
import { Resend } from "resend";
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
    const resend = new Resend(process.env.RESEND_API_KEY);
    const site = process.env.PUBLIC_SITE_URL;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "qr";

    if (!site) return res.status(500).send("PUBLIC_SITE_URL not set");
    await ensureBucket(sb, bucket);

    const { data: residents, error: rerr } = await sb
      .from("residents")
      .select("unit_id, owner_name, email");
    if (rerr) throw rerr;

    const { data: voted } = await sb.from("votes").select("unit_id").eq("poll_id", pollId);
    const votedSet = new Set((voted||[]).map(v => v.unit_id));

    let total = 0, sent = 0;
    for (const r of residents) {
      total++;
      if (!r.email) continue;
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

      const from = process.env.RESEND_FROM;
      await resend.emails.send({
        from,
        to: r.email,
        subject: "Indah Samudra – Your QR to Vote",
        html: `<p>Hi ${r.owner_name},</p>
<p>Scan this QR with your phone camera to vote for the condo painting (works once, expires in 30 days):</p>
<p><img src="${pub}" alt="Voting QR" style="max-width:300px"/></p>
<p>If you prefer, you can click this link instead: <a href="${link}">${link}</a></p>
<p>— Management</p>`
      });

      await sb.from("vote_tokens").update({ sent_at: new Date().toISOString() }).eq("id", ins.data.id);
      sent++;
    }

    return res.status(200).json({ total, sent });
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.message || "Email QR failed");
  }
}
