
import crypto from "crypto";
import QRCode from "qrcode";
import { getSupabaseServer, getResend, ensureBucket, assertPublicSiteUrl, getEnv } from "./_config.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  try {
    const { pollId } = req.body || {};
    if (!pollId) return res.status(400).send("Missing pollId");

    const sb = getSupabaseServer();
    const { resend, from } = getResend();
    const site = assertPublicSiteUrl();
    const { SUPABASE_STORAGE_BUCKET } = getEnv();
    await ensureBucket(sb);

    const { data: residents, error: rerr } = await sb.from("residents").select("unit_id, owner_name, email");
    if (rerr) throw rerr;

    const { data: voted } = await sb.from("votes").select("unit_id").eq("poll_id", pollId);
    const votedSet = new Set((voted||[]).map(v => v.unit_id));

    let total=0, sent=0;
    for (const r of residents) {
      total++;
      if (!r.email) continue;
      if (votedSet.has(r.unit_id)) continue;

      await sb.from("vote_tokens").update({ expires_at: new Date().toISOString() }).eq("poll_id", pollId).eq("unit_id", r.unit_id).is("used_at", null);

      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();
      const ins = await sb.from("vote_tokens").insert({ poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires }).select("id").single();
      if (ins.error) throw ins.error;

      const link = `${site}/?t=${raw}`;
      const png = await QRCode.toBuffer(link, { width: 700, margin: 2 });
      const path = `${pollId}/${r.unit_id}.png`;
      const up = await sb.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      const pub = sb.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;

      await resend.emails.send({
        from, to: r.email,
        subject: "Indah Samudra – Your QR to Vote",
        html: `<p>Hi ${r.owner_name},</p>
<p>Scan this QR with your phone camera to vote (one-time, expires in 30 days):</p>
<p><img src="${pub}" alt="Voting QR" style="max-width:300px"/></p>
<p>If you prefer, click this link: <a href="${link}">${link}</a></p>
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
