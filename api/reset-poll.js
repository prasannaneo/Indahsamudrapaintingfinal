import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const { pollId, code } = req.body || {};
    const expected = process.env.ADMIN_RESET_CODE || process.env.VITE_ADMIN_SETUP_CODE;
    if (!code || code !== expected) return res.status(401).json({ error: "Invalid code" });
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    const supabase = createClient(url, key);
    const { error: e1 } = await supabase.from("votes").delete().eq("poll_id", pollId);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("vote_tokens").delete().eq("poll_id", pollId);
    if (e2) throw e2;
    res.json({ votesDeleted: "ok", tokensDeleted: "ok" });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
