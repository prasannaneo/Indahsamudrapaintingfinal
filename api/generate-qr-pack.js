import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

function sha256HexNode(str) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function randomToken(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  let s = ""; for (let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

export default async function handler(req, res) {
  try {
    const { pollId } = req.body || {};
    const site = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || (req.headers["x-forwarded-proto"] && req.headers.host ? `${req.headers["x-forwarded-proto"]}://${req.headers.host}` : "");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) return res.status(500).send("supabaseKey is required.");
    if (!site) return res.status(500).send("PUBLIC_SITE_URL not set");

    const supabase = createClient(url, key);

    // Load residents list
    const { data: residents, error: rerr } = await supabase.from("residents").select("unit_id, owner_name");
    if (rerr) throw rerr;

    // Ensure a token exists for each resident
    const tokens = [];
    for (const r of residents) {
      // Try to find existing token
      let { data: t } = await supabase.from("vote_tokens").select("id, token_hash").eq("poll_id", pollId).eq("unit_id", r.unit_id).maybeSingle();
      let raw;
      if (!t) {
        raw = randomToken(12);
        const token_hash = sha256HexNode(raw);
        const ins = await supabase.from("vote_tokens").insert({ poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash }).select("id").single();
        if (ins.error) throw ins.error;
      } else {
        // generate a fresh raw that hashes to existing? we can't, so issue new
        raw = randomToken(12);
        const token_hash = sha256HexNode(raw);
        const upd = await supabase.from("vote_tokens").upsert({ poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash }).select("id").single();
        if (upd.error) throw upd.error;
      }
      tokens.push({ unit_id: r.unit_id, owner_name: r.owner_name, url: `${site}/?t=${raw}` });
    }

    // Build PDF
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks = []; doc.on("data", (c) => chunks.push(c)); doc.on("end", () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${pollId}-QR-pack.pdf"`);
      res.status(200).send(pdf);
    });

    for (const t of tokens) {
      doc.fontSize(16).text("Indah Samudra Condo Painting – Voting", { align: "left" });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Unit: ${t.unit_id}`);
      doc.text(`Owner: ${t.owner_name || "-"}`);
      doc.moveDown(0.5);
      const qrDataUrl = await QRCode.toDataURL(t.url);
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const img = Buffer.from(base64, "base64");
      doc.image(img, { fit: [260, 260] });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#334155").text(t.url);
      doc.addPage();
    }
    doc.end();
  } catch (e) {
    res.status(500).send(e.message || String(e));
  }
}
