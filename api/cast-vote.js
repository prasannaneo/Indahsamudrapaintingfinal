
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
const sha256Hex=(s)=>createHash("sha256").update(s,"utf8").digest("hex");

export default async function handler(req,res){
  try{
    const { pollId, token, optionId, dryRun } = req.body||{};
    if(!pollId||!token) return res.status(400).json({error:"Missing pollId/token"});
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
    if(!url||!key) return res.status(500).json({error:"Server key missing"});
    const db=createClient(url,key);

    const hash=sha256Hex(token);
    const { data: tok, error:terr } = await db.from("vote_tokens").select("id,unit_id,owner_name,used_at,expires_at").eq("poll_id",pollId).eq("token_hash",hash).maybeSingle();
    if(terr) throw terr;
    if(!tok) return res.status(400).json({error:"Invalid QR. Please use the official QR from Management."});
    if(tok.used_at) return res.status(400).json({error:"This QR has already been used."});
    if(tok.expires_at && new Date(tok.expires_at) < new Date()) return res.status(400).json({error:"This QR has expired. Please request a new one."});

    if(dryRun) return res.json({ok:true, unit:{unit_id:tok.unit_id, owner_name:tok.owner_name}});
    if(!optionId) return res.status(400).json({error:"Missing optionId"});

    const ipHeader = req.headers["x-forwarded-for"]||req.headers["x-real-ip"]||"";
    const ip = Array.isArray(ipHeader)?ipHeader[0]:String(ipHeader).split(",")[0].trim();
    const ua = req.headers["user-agent"]||"";

    const ins = await db.from("votes").insert({poll_id:pollId,unit_id:tok.unit_id,unit:tok.unit_id,option_id:optionId,name:tok.owner_name,voter_name:tok.owner_name});
    if(ins.error){
      if(String(ins.error.message||"").toLowerCase().includes("duplicate")) return res.status(400).json({error:"Your unit has already voted. Thank you."});
      throw ins.error;
    }
    const upd = await db.from("vote_tokens").update({used_at:new Date().toISOString()}).eq("id",tok.id);
    if(upd.error) throw upd.error;
    await db.from("vote_audit").insert({poll_id:pollId,unit_id:tok.unit_id,option_id:optionId,voter_name:tok.owner_name,ip,user_agent:ua});
    res.json({ok:true});
  }catch(e){ res.status(500).json({error:e.message||String(e)}); }
}
