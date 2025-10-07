export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    return res.status(500).send("Twilio WhatsApp env vars missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)");
  }
  res.status(200).json({ total: 0, sent: 0 });
}
