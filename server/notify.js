// Sends a WhatsApp notification for every new chemical request using CallMeBot
// (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
//
// This is intentionally isolated in one file: if you later move to the
// official WhatsApp Business API (Meta Cloud API) or Twilio, you only need
// to rewrite sendWhatsAppNotification() below — nothing else in the app
// needs to change.

const ENABLED = String(process.env.WHATSAPP_NOTIFY_ENABLED || "false").toLowerCase() === "true";
const PHONE = process.env.WHATSAPP_PHONE; // e.g. 919998887777 (country code, no + or spaces)
const API_KEY = process.env.WHATSAPP_APIKEY;

function buildMessage(record) {
  const lines = [
    "New chemical request — Hit Enterprise",
    `Ref #${record.id}`,
    `Name: ${record.name}${record.company ? " (" + record.company + ")" : ""}`,
    `Phone: ${record.phone}`,
    `Chemical: ${record.chemical}`,
    `Qty: ${record.quantity} ${record.unit}`,
  ];
  if (record.industry) lines.push(`Industry: ${record.industry}`);
  if (record.message) lines.push(`Notes: ${record.message}`);
  return lines.join("\n");
}

async function sendWhatsAppNotification(record) {
  if (!ENABLED) return;
  if (!PHONE || !API_KEY) {
    console.warn("WhatsApp notify is enabled but WHATSAPP_PHONE or WHATSAPP_APIKEY is missing — skipping.");
    return;
  }

  const text = encodeURIComponent(buildMessage(record));
  const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE}&text=${text}&apikey=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("WhatsApp notify failed:", res.status, await res.text());
    }
  } catch (err) {
    // Never let a notification failure break the actual inquiry submission
    console.error("WhatsApp notify error:", err.message);
  }
}

module.exports = { sendWhatsAppNotification };
