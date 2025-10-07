import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  try {
    const { code } = req.body || {};

    if (!process.env.ADMIN_RESET_CODE) throw new Error("ADMIN_RESET_CODE not set");
    if (code !== process.env.ADMIN_RESET_CODE) return res.status(403).send("Reset code mismatch");

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE envs missing");
    const sb = createClient(url, key);

    const { count: residentsBefore } = await sb.from("residents").select("id", { count: "exact", head: true });
    const { count: votesBefore }     = await sb.from("votes").select("id", { count: "exact", head: true });
    const { count: tokensBefore }    = await sb.from("vote_tokens").select("id", { count: "exact", head: true });

    const del = await sb.from("residents").delete().neq("unit_id", "");
    if (del.error) throw del.error;

    res.status(200).json({
      ok: true,
      residentsDeleted: residentsBefore || 0,
      cascadeVotesDeleted: votesBefore || 0,
      cascadeTokensDeleted: tokensBefore || 0
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || "Reset residents failed");
  }
}
