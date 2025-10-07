
import crypto from "crypto";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  try {
    const { pollId } = req.body || {};
    if (!pollId) return res.status(400).send("Missing pollId");

    const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const site = process.env.PUBLIC_SITE_URL;
    if (!site) return res.status(500).send("PUBLIC_SITE_URL not set");

    const { data: residents, error: rerr } = await sb.from("residents").select("unit_id, owner_name");
    if (rerr) throw rerr;
    const { data: voted } = await sb.from("votes").select("unit_id").eq("poll_id", pollId);
    const votedSet = new Set((voted||[]).map(v => v.unit_id));
    const targets = residents.filter(r => !votedSet.has(r.unit_id));

    const pages = [];
    for (const r of targets) {
      await sb.from("vote_tokens").update({ expires_at: new Date().toISOString() })
        .eq("poll_id", pollId).eq("unit_id", r.unit_id).is("used_at", null);
      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();
      const ins = await sb.from("vote_tokens").insert({
        poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires
      }).select("id").single();
      if (ins.error) throw ins.error;
      const link = `${site}/?t=${raw}`;
      const png = await QRCode.toBuffer(link, { width: 500, margin: 2 });
      pages.push({ unit: r.unit_id, owner: r.owner_name, png, link });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pollId}-QR-pack.pdf"`);
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);
    for (let i=0; i<pages.length; i++) {
      const p = pages[i];
      if (i>0) doc.addPage();
      doc.fontSize(18).text("Indah Samudra – Official Voting QR", { align: "left" });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Unit: ${p.unit}`);
      doc.text(`Owner: ${p.owner}`);
      doc.moveDown(0.5);
      doc.image(p.png, { width: 260 });
      doc.moveDown(0.5);
      doc.fontSize(11).text("Scan this QR with your phone camera to vote.", { width: 400 });
      doc.fontSize(9).fillColor("#64748b").text(`If you cannot scan, type this address: ${p.link}`, { width: 400 });
      doc.fillColor("black");
      doc.fontSize(9).text("This link works once and expires in 30 days.");
    }
    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || "QR pack generation failed");
  }
}
