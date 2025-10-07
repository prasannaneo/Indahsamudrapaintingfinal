import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  try {
    const { pollId } = req.body || {};
    if (!pollId) return res.status(400).send("Missing pollId");

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE envs missing");
    const site = process.env.PUBLIC_SITE_URL;
    if (!site) throw new Error("PUBLIC_SITE_URL not set");

    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM;
    if (!resendKey || !resendFrom) throw new Error("Resend envs missing");
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    const sb = createClient(url, key);
    const { data: residents } = await sb.from("residents").select("unit_id, owner_name, email");
    const { data: voted } = await sb.from("votes").select("unit_id").eq("poll_id", pollId);
    const votedSet = new Set((voted||[]).map(v => v.unit_id));

    let total=0, sent=0;
    for (const r of residents||[]) {
      total++;
      if (!r.email || votedSet.has(r.unit_id)) continue;

      await sb.from("vote_tokens").update({ expires_at: new Date().toISOString() })
        .eq("poll_id", pollId).eq("unit_id", r.unit_id).is("used_at", null);

      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();
      const ins = await sb.from("vote_tokens").insert({ poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires }).select("id").single();
      if (ins.error) throw ins.error;

      const link = `${site}/?t=${raw}`;
      await resend.emails.send({
        from: resendFrom,
        to: r.email,
        subject: "Indah Samudra – Your QR to Vote",
        html: `<p>Hi ${r.owner_name},</p><p>Use this link to vote: <a href="${link}">${link}</a></p>`
      });

      await sb.from("vote_tokens").update({ sent_at: new Date().toISOString() }).eq("id", ins.data.id);
      sent++;
    }

    res.status(200).json({ total, sent });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || "Email QR failed");
  }
}
