
import { createClient } from "@supabase/supabase-js";
export default async function handler(_req,res){
  try{
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
    const db=createClient(url,key);
    const del = await db.from("residents").delete().not("unit_id","is",null);
    if(del.error) throw del.error;
    res.status(200).send("All residents removed.");
  }catch(e){ res.status(500).send(e.message||String(e)); }
}
