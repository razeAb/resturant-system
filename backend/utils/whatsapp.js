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

const getMissingTwilioWhatsAppEnv = () =>
  ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"].filter((key) => !process.env[key]);

const formatWhatsAppTo = (phone) => {
  const raw = String(phone || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  if (digits.startsWith("972")) return `+${digits}`;
  return digits;
};

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

async function sendWhatsAppTemplate({ to, contentSid, contentVariables }) {
  const missing = getMissingTwilioWhatsAppEnv();
  if (missing.length) {
    console.warn("⚠️ WhatsApp template skipped (missing env):", missing.join(", "));
    return { skipped: true, reason: "missing_env", missing };
  }
  if (!contentSid) return { skipped: true, reason: "missing_template_sid" };
  const formattedTo = formatWhatsAppTo(to);
  if (!formattedTo) return { skipped: true, reason: "missing_to" };

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${formattedTo}`,
    contentSid,
    contentVariables: JSON.stringify(contentVariables || {}),
  });
  return { sent: true, sid: message?.sid, to: formattedTo, via: "template" };
}

async function sendWhatsAppText({ to, body }) {
  const missing = getMissingTwilioWhatsAppEnv();
  if (missing.length) {
    console.warn("⚠️ WhatsApp message skipped (missing env):", missing.join(", "));
    return { skipped: true, reason: "missing_env", missing };
  }
  const formattedTo = formatWhatsAppTo(to);
  if (!formattedTo) return { skipped: true, reason: "missing_to" };

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${formattedTo}`,
    body: String(body || "").trim(),
  });
  return { sent: true, sid: message?.sid, to: formattedTo, via: "text" };
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

async function notifyCustomerEtaWhatsApp(orderId, minutes) {
  const etaMinutes = Number(minutes);
  if (!Number.isFinite(etaMinutes) || etaMinutes <= 0) return { skipped: true, reason: "invalid_minutes" };

  const missing = getMissingTwilioWhatsAppEnv();
  if (missing.length) {
    console.warn("⚠️ Customer WhatsApp skipped (missing env):", missing.join(", "));
    return { skipped: true, reason: "missing_env", missing };
  }

  const templateSid = process.env.TWILIO_CUSTOMER_ETA_TEMPLATE_SID;
  if (!templateSid) return { skipped: true, reason: "missing_template_sid" };

  const now = new Date();
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);
  const retryAfter = new Date(Date.now() - RETRY_COOLDOWN_MS);

  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      $and: [
        {
          $or: [
            { "customerWhatsApp.etaNotifiedAt": { $exists: false } },
            { "customerWhatsApp.etaNotifiedAt": null },
            { "customerWhatsApp.etaMinutes": { $ne: etaMinutes } },
          ],
        },
        {
          $or: [
            { "customerWhatsApp.etaLastAttemptAt": { $exists: false } },
            { "customerWhatsApp.etaLastAttemptAt": null },
            { "customerWhatsApp.etaLastAttemptAt": { $lte: retryAfter } },
          ],
        },
        {
          $or: [
            { "customerWhatsApp.etaSending": { $ne: true } },
            { "customerWhatsApp.etaSendingAt": { $exists: false } },
            { "customerWhatsApp.etaSendingAt": null },
            { "customerWhatsApp.etaSendingAt": { $lte: staleBefore } },
          ],
        },
      ],
    },
    {
      $set: {
        "customerWhatsApp.etaSending": true,
        "customerWhatsApp.etaSendingAt": now,
        "customerWhatsApp.etaLastAttemptAt": now,
        "customerWhatsApp.etaMinutes": etaMinutes,
      },
      $inc: { "customerWhatsApp.etaAttempts": 1 },
    },
    { new: true }
  );

  if (!claimed) return { skipped: true, reason: "already_sent_or_sending" };

  await claimed.populate("user", "phone").catch(() => {});
  const phone = claimed?.phone || claimed?.user?.phone;
  if (!phone) {
    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          "customerWhatsApp.etaSending": false,
          "customerWhatsApp.etaSendingAt": null,
          "customerWhatsApp.etaLastError": "Missing customer phone",
        },
      }
    );
    return { skipped: true, reason: "missing_phone" };
  }

  try {
    const statusUrl = "https://hungryresturant.netlify.app/order-status";
    const result = await sendWhatsAppTemplate({
      to: phone,
      contentSid: templateSid,
      contentVariables: { 1: String(etaMinutes), 2: statusUrl },
    });
    if (result?.sent) {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            "customerWhatsApp.etaNotifiedAt": new Date(),
            "customerWhatsApp.etaMessageSid": result.sid || "",
            "customerWhatsApp.etaSending": false,
            "customerWhatsApp.etaSendingAt": null,
            "customerWhatsApp.etaLastError": "",
          },
        }
      );
    } else {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            "customerWhatsApp.etaSending": false,
            "customerWhatsApp.etaSendingAt": null,
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
          "customerWhatsApp.etaSending": false,
          "customerWhatsApp.etaSendingAt": null,
          "customerWhatsApp.etaLastError": String(msg).slice(0, 1000),
        },
      }
    );
    throw err;
  }
}

module.exports = { sendWhatsAppNotification, notifyOwnerWhatsAppForOrder, notifyCustomerEtaWhatsApp };
