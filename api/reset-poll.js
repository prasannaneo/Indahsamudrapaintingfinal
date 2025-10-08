import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const { pollId, code, hard } = req.body || {};
    const expected = process.env.ADMIN_RESET_CODE || process.env.VITE_ADMIN_SETUP_CODE;
    if (!code || code !== expected) {
      return res.status(401).json({ error: "Invalid code" });
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) return res.status(500).json({ error: "Supabase server key missing" });

    const supabase = createClient(url, key);

    let delVotes, delTokens;

    if (hard) {
      // HARD RESET: clear ALL polls
      delVotes  = await supabase.from("votes").delete().not("id", "is", null);
      delTokens = await supabase.from("vote_tokens").delete().not("id", "is", null);
    } else {
      // NORMAL RESET: only this poll
      delVotes  = await supabase.from("votes").delete().eq("poll_id", pollId);
      delTokens = await supabase.from("vote_tokens").delete().eq("poll_id", pollId);
    }

    if (delVotes.error)  throw delVotes.error;
    if (delTokens.error) throw delTokens.error;

    res.json({
      ok: true,
      scope: hard ? "all" : "current",
      deleted: {
        votes: delVotes.data ? delVotes.data.length : undefined,
        tokens: delTokens.data ? delTokens.data.length : undefined
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
