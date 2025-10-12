
import { createClient } from "@supabase/supabase-js";
export default async function handler(req,res){
  try{
    const { pollId, code, hard } = req.body||{};
    const expected=process.env.ADMIN_RESET_CODE||process.env.VITE_ADMIN_SETUP_CODE;
    if(!code||code!==expected) return res.status(401).json({error:"Invalid code"});
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
    if(!url||!key) return res.status(500).json({error:"Supabase server key missing"});
    const db=createClient(url,key);
    const delVotes = hard? await db.from("votes").delete().not("id","is",null) : await db.from("votes").delete().eq("poll_id",pollId);
    const resetTok = hard? await db.from("vote_tokens").update({used_at:null}).not("id","is",null) : await db.from("vote_tokens").update({used_at:null}).eq("poll_id",pollId);
    if(delVotes.error) throw delVotes.error; if(resetTok.error) throw resetTok.error;
    res.json({ok:true, scope: hard?"all":"current"});
  }catch(e){ res.status(500).json({error:e.message||String(e)}); }
}
