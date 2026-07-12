const axios = require("axios");

const REQUIRED_ENV = ["INFORU_USERNAME", "INFORU_API_TOKEN", "INFORU_SENDER"];

const getMissingInforuEnv = () => REQUIRED_ENV.filter((key) => !process.env[key]);

const escapeXml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatInforuRecipient = (phone) => {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return `0${digits.slice(3)}`;
  return digits;
};

const buildDeliveryNotificationUrl = () => {
  const url = process.env.INFORU_DLR_URL;
  const secret = process.env.INFORU_DLR_SECRET;
  if (!url) return "";
  if (!secret) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}secret=${encodeURIComponent(secret)}`;
};

async function sendInforuSms({ to, body, customerMessageId }) {
  const missing = getMissingInforuEnv();
  if (missing.length) {
    console.warn("⚠️ InforU SMS skipped (missing env):", missing.join(", "));
    return { skipped: true, reason: "missing_env", missing };
  }

  const recipient = formatInforuRecipient(to);
  if (!recipient) return { skipped: true, reason: "missing_to" };

  const deliveryNotificationUrl = buildDeliveryNotificationUrl();

  const xml =
    "<Inforu>" +
    "<User>" +
    `<Username>${escapeXml(process.env.INFORU_USERNAME)}</Username>` +
    `<ApiToken>${escapeXml(process.env.INFORU_API_TOKEN)}</ApiToken>` +
    "</User>" +
    '<Content Type="sms">' +
    `<Message>${escapeXml(body)}</Message>` +
    "</Content>" +
    "<Recipients>" +
    `<PhoneNumber>${escapeXml(recipient)}</PhoneNumber>` +
    "</Recipients>" +
    "<Settings>" +
    `<Sender>${escapeXml(process.env.INFORU_SENDER)}</Sender>` +
    (customerMessageId ? `<CustomerMessageID>${escapeXml(customerMessageId)}</CustomerMessageID>` : "") +
    (deliveryNotificationUrl ? `<DeliveryNotificationUrl>${escapeXml(deliveryNotificationUrl)}</DeliveryNotificationUrl>` : "") +
    "</Settings>" +
    "</Inforu>";

  const response = await axios.post(
    "https://api.inforu.co.il/SendMessageXml.ashx",
    new URLSearchParams({ InforuXML: xml }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } }
  );

  const text = String(response.data || "");
  const statusMatch = text.match(/<Status>(-?\d+)<\/Status>/);
  const descriptionMatch = text.match(/<Description>([\s\S]*?)<\/Description>/);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  const description = descriptionMatch ? descriptionMatch[1] : "";

  if (status !== 1) {
    throw new Error(`InforU SMS failed (status ${status}): ${description || text}`);
  }

  return { sent: true, via: "inforu_sms", status, description };
}

module.exports = { sendInforuSms };
