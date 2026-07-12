const Order = require("../models/Order");
const { sendInforuSms } = require("./inforu");

const STALE_SENDING_MS = 2 * 60 * 1000;
const RETRY_COOLDOWN_MS = 30 * 1000;

const getMissingInforuSmsEnv = () =>
  ["INFORU_USERNAME", "INFORU_API_TOKEN", "INFORU_SENDER", "OWNER_SMS_TO"].filter((key) => !process.env[key]);

async function sendOwnerSms({ body, orderId }) {
  const missing = getMissingInforuSmsEnv();
  if (missing.length) {
    console.warn("⚠️ Owner SMS skipped (missing env):", missing.join(", "));
    return { skipped: true, reason: "missing_env", missing };
  }

  const result = await sendInforuSms({
    to: process.env.OWNER_SMS_TO,
    body: String(body || "").trim(),
    customerMessageId: orderId,
  });
  return { ...result, via: "sms" };
}

async function notifyOwnerSmsForOrder(orderOrId) {
  const orderId = typeof orderOrId === "string" ? orderOrId : orderOrId?._id?.toString?.() || orderOrId?._id;
  if (!orderId) return { skipped: true, reason: "missing_order_id" };

  const missing = getMissingInforuSmsEnv();
  if (missing.length) {
    console.warn("⚠️ Owner SMS skipped (missing env):", missing.join(", "));
    return { skipped: true, reason: "missing_env", missing };
  }

  const now = new Date();
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);
  const retryAfter = new Date(Date.now() - RETRY_COOLDOWN_MS);

  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      $and: [
        { $or: [{ "ownerSms.notifiedAt": { $exists: false } }, { "ownerSms.notifiedAt": null }] },
        {
          $or: [
            { "ownerSms.lastAttemptAt": { $exists: false } },
            { "ownerSms.lastAttemptAt": null },
            { "ownerSms.lastAttemptAt": { $lte: retryAfter } },
          ],
        },
        {
          $or: [
            { "ownerSms.sending": { $ne: true } },
            { "ownerSms.sendingAt": { $exists: false } },
            { "ownerSms.sendingAt": null },
            { "ownerSms.sendingAt": { $lte: staleBefore } },
          ],
        },
      ],
    },
    {
      $set: { "ownerSms.sending": true, "ownerSms.sendingAt": now, "ownerSms.lastAttemptAt": now },
      $inc: { "ownerSms.attempts": 1 },
    },
    { new: true }
  );

  if (!claimed) return { skipped: true, reason: "already_sent_or_sending" };

  const lastSix = String(orderId).slice(-6);
  const total = Number(claimed?.totalPrice) || 0;
  const delivery = claimed?.deliveryOption || "";
  const itemsCount = Array.isArray(claimed?.items) ? claimed.items.length : 0;
  const who = claimed?.customerName || claimed?.phone || claimed?.user?.toString?.() || "";
  const deliveryLabel = delivery === "Pickup" ? "איסוף" : delivery === "Delivery" ? "משלוח" : delivery === "EatIn" ? "ישיבה במקום" : delivery;
  const body = `הזמנה חדשה (${lastSix}) • ₪${total} • ${deliveryLabel}\nפריטים: ${itemsCount}\n${who}`;

  try {
    const result = await sendOwnerSms({ body, orderId });
    if (result?.sent) {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            "ownerSms.notifiedAt": new Date(),
            "ownerSms.messageSid": result.sid || "",
            "ownerSms.sending": false,
            "ownerSms.sendingAt": null,
            "ownerSms.lastError": "",
          },
        }
      );
    } else {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: { "ownerSms.sending": false, "ownerSms.sendingAt": null },
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
          "ownerSms.sending": false,
          "ownerSms.sendingAt": null,
          "ownerSms.lastError": String(msg).slice(0, 1000),
        },
      }
    );
    throw err;
  }
}

async function notifyCustomerEtaSms(orderId, minutes) {
  const etaMinutes = Number(minutes);
  if (!Number.isFinite(etaMinutes) || etaMinutes <= 0) return { skipped: true, reason: "invalid_minutes" };

  const missing = getMissingInforuSmsEnv();
  if (missing.length) {
    console.warn("⚠️ Customer ETA SMS skipped (missing env):", missing.join(", "));
    return { skipped: true, reason: "missing_env", missing };
  }

  const now = new Date();
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);
  const retryAfter = new Date(Date.now() - RETRY_COOLDOWN_MS);

  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      $and: [
        {
          $or: [
            { "customerSms.etaNotifiedAt": { $exists: false } },
            { "customerSms.etaNotifiedAt": null },
            { "customerSms.etaMinutes": { $ne: etaMinutes } },
          ],
        },
        {
          $or: [
            { "customerSms.etaLastAttemptAt": { $exists: false } },
            { "customerSms.etaLastAttemptAt": null },
            { "customerSms.etaLastAttemptAt": { $lte: retryAfter } },
          ],
        },
        {
          $or: [
            { "customerSms.etaSending": { $ne: true } },
            { "customerSms.etaSendingAt": { $exists: false } },
            { "customerSms.etaSendingAt": null },
            { "customerSms.etaSendingAt": { $lte: staleBefore } },
          ],
        },
      ],
    },
    {
      $set: {
        "customerSms.etaSending": true,
        "customerSms.etaSendingAt": now,
        "customerSms.etaLastAttemptAt": now,
        "customerSms.etaMinutes": etaMinutes,
      },
      $inc: { "customerSms.etaAttempts": 1 },
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
          "customerSms.etaSending": false,
          "customerSms.etaSendingAt": null,
          "customerSms.etaLastError": "Missing customer phone",
        },
      }
    );
    return { skipped: true, reason: "missing_phone" };
  }

  const statusUrl = "https://hungrysmokedmeat.com/order-status";
  const body = `היי! ההזמנה שלך ב-Hungry Smoked Meat תהיה מוכנה בעוד כ-${etaMinutes} דקות.\nלמעקב אחרי ההזמנה: ${statusUrl}`;

  try {
    const result = await sendInforuSms({ to: phone, body, customerMessageId: orderId });
    if (result?.sent) {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            "customerSms.etaNotifiedAt": new Date(),
            "customerSms.etaSending": false,
            "customerSms.etaSendingAt": null,
            "customerSms.etaLastError": "",
          },
        }
      );
    } else {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            "customerSms.etaSending": false,
            "customerSms.etaSendingAt": null,
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
          "customerSms.etaSending": false,
          "customerSms.etaSendingAt": null,
          "customerSms.etaLastError": String(msg).slice(0, 1000),
        },
      }
    );
    throw err;
  }
}

module.exports = { notifyOwnerSmsForOrder, notifyCustomerEtaSms };
