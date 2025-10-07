
import crypto from "crypto";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { pollId } = req.body || {};
  try {
    const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const site = process.env.PUBLIC_SITE_URL;

    // residents who haven't voted
    const { data: residents, error: rerr } = await sb
      .from("residents")
      .select("unit_id, owner_name, email")
      .neq("email", null);
    if (rerr) throw rerr;

    let total = residents.length, sent = 0;
    for (const r of residents) {
      // skip if unit already has a vote
      const { data: v1 } = await sb.from("votes").select("id").eq("poll_id", pollId).eq("unit_id", r.unit_id).limit(1);
      if (v1 && v1.length > 0) continue;

      // generate token raw + hash
      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");

      // expire old unused tokens for this unit
      await sb.from("vote_tokens").update({ expires_at: new Date().toISOString() }).eq("poll_id", pollId).eq("unit_id", r.unit_id).is("used_at", null);

      // insert new token (denorm owner_name for UI)
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString(); // 30d
      await sb.from("vote_tokens").insert({ poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires });

      const link = `${site}/?t=${raw}`;
      // send email
      const from = process.env.RESEND_FROM;
      if (!from) throw new Error("RESEND_FROM not set");
      await resend.emails.send({
        from,
        to: r.email,
        subject: "Vote: Indah Samudra Condo Painting",
        html: `<p>Hi ${r.owner_name},</p>
<p>Please vote for the new condo painting. Your secure one-time link:</p>
<p><a href="${link}">${link}</a></p>
<p>This link works once and expires in 30 days.</p>`
      });

      await sb.from("vote_tokens").update({ sent_at: new Date().toISOString() }).eq("poll_id", pollId).eq("token_hash", hash);
      sent++;
    }

    return res.status(200).json({ total, sent });
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.message || "Invite failed");
  }
}
