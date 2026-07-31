// Multi-provider instant notification module for Hit Enterprise
// Supports: CallMeBot WhatsApp, Meta WhatsApp Cloud API, Twilio SMS/WhatsApp, Telegram Bot, & Resend Email.

const NOTIFY_PROVIDER = (process.env.NOTIFY_PROVIDER || "callmebot").toLowerCase();
const NOTIFY_ENABLED = String(process.env.NOTIFY_ENABLED || process.env.WHATSAPP_NOTIFY_ENABLED || "false").toLowerCase() === "true";

function buildNotificationMessage(record) {
  const lines = [
    "🔔 *New Chemical Request — Hit Enterprise*",
    `*Ref #:* ${record.id}`,
    `*Client:* ${record.name}${record.company ? " (" + record.company + ")" : ""}`,
    `*Phone:* ${record.phone}`,
    record.email ? `*Email:* ${record.email}` : null,
    `*Chemical:* ${record.chemical}`,
    `*Quantity:* ${record.quantity} ${record.unit || "kg"}`,
    record.industry ? `*Industry:* ${record.industry}` : null,
    record.message ? `*Notes:* ${record.message}` : null,
    `*Time:* ${new Date(record.createdAt).toLocaleString("en-IN")}`,
  ].filter(Boolean);

  return lines.join("\n");
}

async function sendNotification(record) {
  if (!NOTIFY_ENABLED) return;

  const text = buildNotificationMessage(record);

  try {
    switch (NOTIFY_PROVIDER) {
      case "telegram":
        await sendTelegram(text);
        break;
      case "meta":
        await sendMetaWhatsApp(record);
        break;
      case "twilio":
        await sendTwilio(text);
        break;
      case "resend":
        await sendResendEmail(record, text);
        break;
      case "callmebot":
      default:
        await sendCallMeBot(text);
        break;
    }
  } catch (err) {
    console.error(`[Notification Error] ${NOTIFY_PROVIDER}:`, err.message);
  }
}

// 1. CallMeBot WhatsApp (Free & Simple)
async function sendCallMeBot(text) {
  const phone = process.env.WHATSAPP_PHONE;
  const apiKey = process.env.WHATSAPP_APIKEY;
  if (!phone || !apiKey) {
    console.warn("[CallMeBot] WHATSAPP_PHONE or WHATSAPP_APIKEY missing.");
    return;
  }
  const cleanText = encodeURIComponent(text.replace(/\*/g, ""));
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${cleanText}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot returned HTTP ${res.status}`);
}

// 2. Telegram Bot API (100% Free & Reliable)
async function sendTelegram(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing.");
    return;
  }
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
    }),
  });
  if (!res.ok) throw new Error(`Telegram API returned HTTP ${res.status}`);
}

// 3. Meta WhatsApp Cloud API (Official Meta)
async function sendMetaWhatsApp(record) {
  const phoneId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_ACCESS_TOKEN;
  const recipient = process.env.ADMIN_WHATSAPP_PHONE;
  if (!phoneId || !token || !recipient) {
    console.warn("[Meta WhatsApp] META_PHONE_NUMBER_ID, META_ACCESS_TOKEN, or ADMIN_WHATSAPP_PHONE missing.");
    return;
  }
  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: { body: buildNotificationMessage(record).replace(/\*/g, "") },
    }),
  });
  if (!res.ok) throw new Error(`Meta API returned HTTP ${res.status}`);
}

// 4. Twilio SMS / WhatsApp
async function sendTwilio(text) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER; // e.g. 'whatsapp:+14155238886' or '+14155238886'
  const toNumber = process.env.TWILIO_TO_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.warn("[Twilio] Missing Twilio credentials in environment.");
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams();
  params.append("From", fromNumber);
  params.append("To", toNumber);
  params.append("Body", text.replace(/\*/g, ""));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Twilio API returned HTTP ${res.status}`);
}

// 5. Resend Email
async function sendResendEmail(record, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !toEmail) {
    console.warn("[Resend Email] RESEND_API_KEY or ADMIN_EMAIL missing.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "Hit Enterprise Alerts <onboarding@resend.dev>",
      to: [toEmail],
      subject: `[New Lead #${record.id}] ${record.chemical} - ${record.name}`,
      text: text.replace(/\*/g, ""),
    }),
  });
  if (!res.ok) throw new Error(`Resend Email API returned HTTP ${res.status}`);
}

module.exports = { sendNotification, sendWhatsAppNotification: sendNotification };
