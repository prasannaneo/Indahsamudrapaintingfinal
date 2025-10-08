import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const { pollId, unit_id, option_id } = req.body || {};
    if (!pollId || !unit_id || !option_id) {
      return res.status(400).json({ error: "missing pollId/unit_id/option_id" });
    }

    const ipHeader = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
    const ip = Array.isArray(ipHeader) ? ipHeader[0] : String(ipHeader).split(",")[0].trim();
    const user_agent = req.headers["user-agent"] || "";

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) return res.status(500).json({ error: "supabaseKey is required" });

    const supabase = createClient(url, key);
    const { error } = await supabase.from("vote_audit").insert({
      poll_id: pollId,
      unit_id,
      option_id,
      ip,
      user_agent,
    });
    if (error) throw error;

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
