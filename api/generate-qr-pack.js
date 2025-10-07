import crypto from "crypto";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

function getSb() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL/VITE_SUPABASE_URL is required");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  return createClient(url, key);
}
function siteUrl(req) {
  const env = process.env.PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  if (!host) throw new Error("PUBLIC_SITE_URL not set and Host header missing");
  return `${proto}://${host}`;
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  try {
    const { pollId } = req.body || {};
    if (!pollId) return res.status(400).send("Missing pollId");

    const sb = getSb();
    const site = siteUrl(req);

    const { data: residents, error: rerr } = await sb.from("residents").select("unit_id, owner_name");
    if (rerr) throw rerr;

    const { data: voted } = await sb.from("votes").select("unit_id").eq("poll_id", pollId);
    const votedSet = new Set((voted||[]).map(v => v.unit_id));
    const targets = residents.filter(r => !votedSet.has(r.unit_id));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pollId}-QR-pack.pdf"`);
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    for (let i=0; i<targets.length; i++) {
      const r = targets[i];

      await sb.from("vote_tokens")
        .update({ expires_at: new Date().toISOString() })
        .eq("poll_id", pollId)
        .eq("unit_id", r.unit_id)
        .is("used_at", null);

      const raw = crypto.randomBytes(24).toString("base64url");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      const expires = new Date(Date.now() + 1000*60*60*24*30).toISOString();

      const ins = await sb.from("vote_tokens").insert({
        poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash: hash, expires_at: expires
      }).select("id").single();
      if (ins.error) throw ins.error;

      const link = `${site}/?t=${raw}`;
      const png = await QRCode.toBuffer(link, { width: 560, margin: 2 });

      if (i>0) doc.addPage();
      doc.fontSize(18).text("Indah Samudra – Official Voting QR", { align: "left" });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Unit: ${r.unit_id}`);
      doc.text(`Owner: ${r.owner_name}`);
      doc.moveDown(0.5);
      doc.image(png, { width: 260 });
      doc.moveDown(0.5);
      doc.fontSize(11).text("Scan this QR with your phone camera to vote.", { width: 400 });
      doc.fontSize(9).fillColor("#64748b").text(`If you cannot scan, type this address: ${link}`, { width: 400 });
      doc.fillColor("black").fontSize(9).text("This link works once and expires in 30 days.");
    }

    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || "QR pack generation failed");
  }
}
