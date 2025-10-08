import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { createHash, randomBytes } from "node:crypto";

function sha256Hex(str) { return createHash("sha256").update(str, "utf8").digest("hex"); }
function randomToken(len = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  const buf = randomBytes(len);
  let out = ""; for (let i=0;i<len;i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

export default async function handler(req, res) {
  try {
    const { pollId } = req.body || {};
    const site = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL ||
      (req.headers["x-forwarded-proto"] && req.headers.host ? `${req.headers["x-forwarded-proto"]}://${req.headers.host}` : "");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) return res.status(500).send("supabaseKey is required.");
    if (!site) return res.status(500).send("PUBLIC_SITE_URL not set");

    const supabase = createClient(url, key);

    // Load residents
    const { data: residents, error: rerr } = await supabase.from("residents").select("unit_id, owner_name").order("unit_id");
    if (rerr) throw rerr;
    if (!residents || residents.length === 0) return res.status(400).send("No residents found. Upload roster first.");

    // Existing tokens
    const { data: existing } = await supabase.from("vote_tokens").select("unit_id, token_hash").eq("poll_id", pollId);
    const map = new Map((existing || []).map(t => [t.unit_id, t]));

    const tokens = [];
    for (const r of residents) {
      const raw = randomToken(12);
      const token_hash = sha256Hex(raw);
      const payload = { poll_id: pollId, unit_id: r.unit_id, owner_name: r.owner_name, token_hash };
      if (map.has(r.unit_id)) {
        const { error } = await supabase.from("vote_tokens").update(payload).eq("unit_id", r.unit_id).eq("poll_id", pollId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vote_tokens").insert(payload);
        if (error) throw error;
      }
      tokens.push({ unit_id: r.unit_id, owner_name: r.owner_name, url: `${site}/?t=${raw}` });
    }

    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks = []; doc.on("data", (c) => chunks.push(c)); doc.on("end", () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${pollId}-QR-pack.pdf"`);
      res.status(200).send(pdf);
    });

    const pagePerSheet = 4;
    let i = 0;
    for (const t of tokens) {
      if (i % pagePerSheet === 0) {
        if (i !== 0) doc.addPage();
        doc.fontSize(16).text("Indah Samudra Condo Painting – QR Pack", { align: "left" });
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor("#334155").text(`Poll: ${pollId}  •  Generated at: ${new Date().toLocaleString()}`);
        doc.fillColor("black");
        doc.moveDown(0.5);
      }
      const col = (i % pagePerSheet) % 2;
      const row = Math.floor((i % pagePerSheet) / 2);
      const x = 36 + col * (250 + 36);
      const y = 96 + row * (320);

      doc.roundedRect(x - 6, y - 8, 260, 300, 8).stroke("#e5e7eb");
      doc.fontSize(12).text(`Unit: ${t.unit_id}`, x, y);
      doc.fontSize(10).text(`Owner: ${t.owner_name || "-"}`, x, y + 16);
      const qrDataUrl = await QRCode.toDataURL(t.url);
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const img = Buffer.from(base64, "base64");
      doc.image(img, x, y + 32, { fit: [220, 220] });
      // (URL text intentionally removed)
      doc.fillColor("black");
      i++;
    }

    doc.end();
  } catch (e) {
    res.status(500).send(e.message || String(e));
  }
}
