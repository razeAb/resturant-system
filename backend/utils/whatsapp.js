const twilio = require("twilio");
const Order = require("../models/Order");

const requiredEnv = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
  "OWNER_WHATSAPP_TO",
  "TWILIO_WHATSAPP_TEMPLATE_SID",
];

const getMissingWhatsAppEnv = () => requiredEnv.filter((key) => !process.env[key]);
const hasWhatsAppConfig = () => getMissingWhatsAppEnv().length === 0;

const STALE_SENDING_MS = 2 * 60 * 1000;
const RETRY_COOLDOWN_MS = 30 * 1000;
let didWarnMissingEnv = false;

async function sendWhatsAppNotification(order) {
  const missing = getMissingWhatsAppEnv();
  if (missing.length) {
    if (!didWarnMissingEnv) {
      console.warn("⚠️ WhatsApp notification skipped (missing env):", missing.join(", "));
      didWarnMissingEnv = true;
    }
    return { skipped: true, reason: "missing_env", missing };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${process.env.OWNER_WHATSAPP_TO}`,
    contentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID,
  });
  return { sent: true, sid: message?.sid, orderId: order?._id?.toString?.() };
}

async function notifyOwnerWhatsAppForOrder(orderOrId) {
  const orderId = typeof orderOrId === "string" ? orderOrId : orderOrId?._id?.toString?.() || orderOrId?._id;
  if (!orderId) return { skipped: true, reason: "missing_order_id" };

  if (!hasWhatsAppConfig()) {
    const missing = getMissingWhatsAppEnv();
    if (!didWarnMissingEnv) {
      console.warn("⚠️ WhatsApp notification skipped (missing env):", missing.join(", "));
      didWarnMissingEnv = true;
    }
    return { skipped: true, reason: "missing_env", missing };
  }

  const now = new Date();
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);
  const retryAfter = new Date(Date.now() - RETRY_COOLDOWN_MS);

  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      $and: [
        { $or: [{ "ownerWhatsApp.notifiedAt": { $exists: false } }, { "ownerWhatsApp.notifiedAt": null }] },
        {
          $or: [
            { "ownerWhatsApp.lastAttemptAt": { $exists: false } },
            { "ownerWhatsApp.lastAttemptAt": null },
            { "ownerWhatsApp.lastAttemptAt": { $lte: retryAfter } },
          ],
        },
        {
          $or: [
            { "ownerWhatsApp.sending": { $ne: true } },
            { "ownerWhatsApp.sendingAt": { $exists: false } },
            { "ownerWhatsApp.sendingAt": null },
            { "ownerWhatsApp.sendingAt": { $lte: staleBefore } },
          ],
        },
      ],
    },
    {
      $set: { "ownerWhatsApp.sending": true, "ownerWhatsApp.sendingAt": now, "ownerWhatsApp.lastAttemptAt": now },
      $inc: { "ownerWhatsApp.attempts": 1 },
    },
    { new: true }
  );

  if (!claimed) return { skipped: true, reason: "already_sent_or_sending" };

  try {
    const result = await sendWhatsAppNotification(claimed);
    if (result?.sent) {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            "ownerWhatsApp.notifiedAt": new Date(),
            "ownerWhatsApp.messageSid": result.sid || "",
            "ownerWhatsApp.sending": false,
            "ownerWhatsApp.sendingAt": null,
            "ownerWhatsApp.lastError": "",
          },
        }
      );
    } else {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            "ownerWhatsApp.sending": false,
            "ownerWhatsApp.sendingAt": null,
          },
        }
      );
    }
    return result;
  } catch (err) {
    const msg = err?.response?.data || err?.message || String(err);
    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          "ownerWhatsApp.sending": false,
          "ownerWhatsApp.sendingAt": null,
          "ownerWhatsApp.lastError": String(msg).slice(0, 1000),
        },
      }
    );
    throw err;
  }
}

module.exports = { sendWhatsAppNotification, notifyOwnerWhatsAppForOrder };
