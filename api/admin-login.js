
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
const sha = s => createHash("sha256").update(s,"utf8").digest("hex");
export default async function handler(req,res){
  try{
    const { email, password } = req.body||{};
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
    const db=createClient(url,key);
    const { data } = await db.from("admins").select("pass_sha256").eq("email",email).maybeSingle();
    if(!data || data.pass_sha256 !== sha(password)) return res.status(401).json({error:"Invalid credentials"});
    const token = randomBytes(16).toString("hex");
    res.json({ok:true, token});
  }catch(e){ res.status(500).json({error:e.message}); }
}
