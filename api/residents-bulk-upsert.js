import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows)) return res.status(400).send("rows required");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) return res.status(500).send("Supabase server credentials missing");
    const supabase = createClient(url, key);
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from("residents").upsert(chunk, { onConflict: "unit_id" });
      if (error) throw error;
      upserted += chunk.length;
    }
    res.json({ upserted });
  } catch (e) {
    res.status(500).send(e.message || String(e));
  }
}
