
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
const sha = s => createHash("sha256").update(s,"utf8").digest("hex");
export default async function handler(req,res){
  try{
    const { email, password } = req.body||{};
    if(!email||!password) return res.status(400).json({error:"Missing fields"});
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
    const db=createClient(url,key);
    const up = await db.from("admins").upsert({email, pass_sha256: sha(password)});
    if(up.error) throw up.error;
    res.json({ok:true});
  }catch(e){ res.status(500).json({error:e.message}); }
}
