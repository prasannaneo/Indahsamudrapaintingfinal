import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const { code } = req.body || {};
    const expected = process.env.ADMIN_RESET_CODE || process.env.VITE_ADMIN_SETUP_CODE;
    if (!code || code !== expected) return res.status(401).json({ error: "Invalid code" });
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    const supabase = createClient(url, key);
    const { error } = await supabase.from("residents").delete().neq("unit_id", "");
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
