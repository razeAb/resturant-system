const twilio = require("twilio");

const requiredEnv = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
  "OWNER_WHATSAPP_TO",
  "TWILIO_WHATSAPP_TEMPLATE_SID",
];

const hasWhatsAppConfig = () => requiredEnv.every((key) => Boolean(process.env[key]));

async function sendWhatsAppNotification() {
  if (!hasWhatsAppConfig()) {
    return;
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${process.env.OWNER_WHATSAPP_TO}`,
    contentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID,
  });
}

module.exports = { sendWhatsAppNotification };
