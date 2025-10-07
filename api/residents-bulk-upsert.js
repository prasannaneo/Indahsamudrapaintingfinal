
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res){
  if(req.method!=="POST") return res.status(405).send("POST only");
  try{
    const { rows } = req.body || {};
    if(!Array.isArray(rows) || rows.length===0) return res.status(400).send("No rows");

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).send("Server env missing: SUPABASE_SERVICE_ROLE_KEY or URL");

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // normalize
    const norm = (val)=> (val||"").trim();
    const normPhone = (val)=> norm(val).replace(/\s|-/g,"");

    const payload = rows.map(r=>({
      unit_id: norm((r.unit_id||"").toUpperCase()),
      owner_name: norm(r.owner_name),
      email: norm(r.email),
      whatsapp: normPhone(r.whatsapp)
    })).filter(r=>r.unit_id && r.owner_name);

    if(payload.length===0) return res.status(400).send("No valid rows after normalization");

    const { error } = await sb.from("residents").upsert(payload, { onConflict: "unit_id" });
    if(error) throw error;

    return res.status(200).json({ upserted: payload.length });
  }catch(e){
    console.error(e);
    return res.status(500).send(e.message || "Bulk upsert failed");
  }
}
