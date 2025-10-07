import { createClient } from "@supabase/supabase-js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  try {
    const { pollId, code } = req.body || {};
    if (!pollId) return res.status(400).send("Missing pollId");
    if (!process.env.ADMIN_RESET_CODE) throw new Error("ADMIN_RESET_CODE not set");
    if (code !== process.env.ADMIN_RESET_CODE) return res.status(403).send("Reset code mismatch");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE envs missing");
    const sb = createClient(url, key);
    const delVotes = await sb.from("votes").delete().eq("poll_id", pollId).select("id");
    if (delVotes.error) throw delVotes.error;
    const delTokens = await sb.from("vote_tokens").delete().eq("poll_id", pollId).select("id");
    if (delTokens.error) throw delTokens.error;
    res.status(200).json({
      ok: true,
      votesDeleted: (delVotes.data || []).length,
      tokensDeleted: (delTokens.data || []).length
    });
  } catch (e) { console.error(e); res.status(500).send(e.message || "Reset failed"); }
}
