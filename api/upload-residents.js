
import { createClient } from "@supabase/supabase-js";
export const config = { api: { bodyParser: false } };
export default async function handler(req,res){
  try{
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
    const db=createClient(url,key);
    const text = await new Promise((resolve,reject)=>{let d=""; req.setEncoding("utf8"); req.on("data",c=>d+=c); req.on("end",()=>resolve(d)); req.on("error",reject);});
    const rows = text.trim().split(/\r?\n/);
    const header = rows.shift()?.split(",").map(s=>s.trim().toLowerCase());
    if(!header||header[0]!=="unit_id"||header[1]!=="owner_name") return res.status(400).send("CSV header must be: unit_id,owner_name");
    const payload = rows.filter(Boolean).map(line=>{
      const parts = line.split(",");
      const unit_id = (parts[0]||"").replace(/^"|"$/g,"").trim();
      const owner_name = (parts[1]||"").replace(/^"|"$/g,"").trim();
      return { unit_id, owner_name };
    }).filter(x=>x.unit_id);
    if(!payload.length) return res.status(400).send("No valid rows found.");
    const up = await db.from("residents").upsert(payload);
    if(up.error) throw up.error;
    res.status(200).send(`Uploaded ${payload.length} residents`);
  }catch(e){ res.status(500).send(e.message||String(e)); }
}
