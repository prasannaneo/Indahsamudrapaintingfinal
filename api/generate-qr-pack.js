
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { createHash, randomBytes } from "node:crypto";
const sha256Hex = (s)=>createHash("sha256").update(s,"utf8").digest("hex");
const randomToken=(len=12)=>{const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";const b=randomBytes(len);let out="";for(let i=0;i<len;i++) out+=abc[b[i]%abc.length];return out;};

export default async function handler(req,res){
  try{
    const { pollId, validityDays } = req.body||{};
    const site = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || (req.headers["x-forwarded-proto"]&&req.headers.host?`${req.headers["x-forwarded-proto"]}://${req.headers.host}`:"");
    const url  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if(!url||!key) return res.status(500).send("supabaseKey is required.");
    if(!site) return res.status(500).send("PUBLIC_SITE_URL not set");
    const db = createClient(url,key);

    const { data: residents, error:rerr } = await db.from("residents").select("unit_id,owner_name").order("unit_id");
    if(rerr) throw rerr;
    if(!residents||residents.length===0) return res.status(400).send("No residents found. Upload roster first.");

    const { data: existing } = await db.from("vote_tokens").select("unit_id, token_hash").eq("poll_id", pollId);
    const map=new Map((existing||[]).map(t=>[t.unit_id,t]));
    const days = Number(validityDays ?? process.env.QR_VALID_DAYS ?? 14);
    const validDays = Math.max(1, Math.min(30, days));
    const expires_at = new Date(Date.now()+validDays*24*60*60*1000).toISOString();

    const tokens=[];
    for(const r of residents){
      const raw=randomToken(12);
      const token_hash=sha256Hex(raw);
      const payload={poll_id:pollId,unit_id:r.unit_id,owner_name:r.owner_name,token_hash,used_at:null,expires_at};
      if(map.has(r.unit_id)) await db.from("vote_tokens").update(payload).eq("unit_id",r.unit_id).eq("poll_id",pollId);
      else await db.from("vote_tokens").insert(payload);
      tokens.push({unit_id:r.unit_id,owner_name:r.owner_name,url:`${site}/?t=${raw}`});
    }

    const doc=new PDFDocument({size:"A4",margin:36}); const chunks=[]; doc.on("data",c=>chunks.push(c)); doc.on("end",()=>{const pdf=Buffer.concat(chunks); res.setHeader("Content-Type","application/pdf"); res.setHeader("Content-Disposition",`attachment; filename="${pollId}-QR-pack.pdf"`); res.status(200).send(pdf)});
    let i=0; const per=4;
    for(const t of tokens){
      if(i%per===0){ if(i) doc.addPage(); doc.fontSize(16).text("Indah Samudra Condo Painting – QR Pack"); doc.moveDown(0.2); doc.fontSize(10).fillColor("#334155").text(`Poll: ${pollId} • Valid: ${validDays} days`); doc.fillColor("black"); doc.moveDown(0.5); }
      const col=(i%per)%2, row=Math.floor((i%per)/2); const x=36+col*(250+36), y=96+row*(320);
      doc.roundedRect(x-6,y-8,260,300,8).stroke("#e5e7eb"); doc.fontSize(12).text(`Unit: ${t.unit_id}`,x,y); doc.fontSize(10).text(`Owner: ${t.owner_name||"-"}`,x,y+16);
      const dataUrl=await QRCode.toDataURL(t.url); const img=Buffer.from(dataUrl.split(",")[1],"base64"); doc.image(img,x,y+32,{fit:[220,220]}); i++;
    }
    doc.end();
  }catch(e){ res.status(500).send(e.message||String(e)); }
}
