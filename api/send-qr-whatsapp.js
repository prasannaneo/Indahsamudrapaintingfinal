import crypto from "crypto";
import QRCode from "qrcode";
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

    const META_WA_TOKEN = process.env.META_WA_TOKEN;
    const PHONE_ID = process.env.META_WA_PHONE_NUMBER_ID;
    const TEMPLATE = process.env.META_WA_TEMPLATE;
    const TEMPLATE_LANG = process.env.META_WA_TEMPLATE_LANG || "en_US";
    if (!META_WA_TOKEN || !PHONE_ID || !TEMPLATE) {
      throw new Error("Meta WhatsApp envs missing (META_WA_TOKEN, META_WA_PHONE_NUMBER_ID, META_WA_TEMPLATE)");
    }

    const sb = createClient(url, key);
    const { data: residents } = await sb.from("residents").select("unit_id, owner_name, whatsapp");
    const { data: voted } = await sb.from("votes").select("unit_id").eq("poll_id", pollId);
    const votedSet = new Set((voted||[]).map(v => v.unit_id));

    let total=0, sent=0;
    for (const r of residents||[]) {
      total++;
      if (!r.whatsapp || votedSet.has(r.unit_id)) continue;

      await sb.from("vote_tokens").update({ expires_at: new Date().toISOString() })
        .eq("poll_id", pollId).eq("unit_id", r.unit_id).is("used_at", null);

      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();
      const ins = await sb.from("vote_tokens").insert({ poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires }).select("id").single();
      if (ins.error) throw ins.error;

      const link = `${site}/?t=${raw}`;

      const payload = {
        messaging_product: "whatsapp",
        to: r.whatsapp.replace(/^whatsapp:/, ""),
        type: "template",
        template: {
          name: TEMPLATE,
          language: { code: TEMPLATE_LANG },
          components: [
            { type: "body", parameters: [
              { type: "text", text: r.owner_name || "Resident" },
              { type: "text", text: link }
            ] }
          ]
        }
      };

      const resp = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${META_WA_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Meta send failed for ${r.unit_id}: ${err}`);
      }

      await sb.from("vote_tokens").update({ sent_at: new Date().toISOString() }).eq("id", ins.data.id);
      sent++;
    }

    res.status(200).json({ total, sent });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || "WhatsApp (Meta) send failed");
  }
}
