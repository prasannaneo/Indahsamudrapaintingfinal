
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

    // find tokens older than 3 days and unused
    const threeDaysAgo = new Date(Date.now() - 1000*60*60*24*3).toISOString();
    const { data: rows, error } = await sb
      .from("vote_tokens")
      .select("unit_id, owner_name, residents:unit_id (email)")
      .eq("poll_id", pollId)
      .is("used_at", null)
      .lte("sent_at", threeDaysAgo);
    if (error) throw error;

    let sent = 0;
    for (const r of rows) {
      const email = r?.residents?.email;
      if (!email) continue;

      // generate a fresh token for reminder
      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      await sb.from("vote_tokens").update({ expires_at: new Date().toISOString() }).eq("poll_id", pollId).eq("unit_id", r.unit_id).is("used_at", null);
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();
      await sb.from("vote_tokens").insert({ poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires });

      const link = `${site}/?t=${raw}`;
      const from = process.env.RESEND_FROM;
      await resend.emails.send({
        from,
        to: email,
        subject: "Reminder: Vote for Indah Samudra Painting",
        html: `<p>Hi ${r.owner_name},</p>
<p>Gentle reminder to vote for the condo painting. Your secure link:</p>
<p><a href="${link}">${link}</a></p>
<p>This link works once and expires in 30 days.</p>`
      });
      await sb.from("vote_tokens").update({ sent_at: new Date().toISOString() }).eq("poll_id", pollId).eq("token_hash", hash);
      sent++;
    }

    return res.status(200).json({ sent });
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.message || "Reminder failed");
  }
}
