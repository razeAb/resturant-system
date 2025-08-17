const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// If you have app-level parsers, prefer:
// app.use(express.urlencoded({ extended: false }));
// app.use(express.json());
// Then this route can just read req.body.
// If not, keep the text parser & manual parse like you did.

router.post("/tranzila-webhook", express.text({ type: "*/*" }), async (req, res) => {
  try {
    console.log("📬 Webhook headers:", req.headers);
    console.log("📩 Raw Tranzila body:", req.body);

    // Parse application/x-www-form-urlencoded-like body to object
    const parsed = new URLSearchParams(req.body || "");
    const data = Object.fromEntries(parsed.entries());

    console.log("📩 Parsed Tranzila Webhook Data:", data);

    // ✅ 1) Identify success robustly
    const isSuccess =
      data.processor_response_code === "000" ||
      data.Response === "000" ||
      data.response === "000";

    // ✅ 2) Use ud1 as the stable identifier (your own id)
    const clientOrderId = data.ud1 || data.orderId || data.order_id || data.clientOrderId || null;

    console.log("🔎 clientOrderId (from ud1):", clientOrderId);
    if (!clientOrderId) {
      console.warn("⚠️ Success but missing clientOrderId (ud1). Payload lacked ud1.");
      return res.status(200).send("received"); // don't cause retries storm
    }

    // ✅ 3) Optional token protection
    const receivedToken = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && receivedToken !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("❌ Invalid webhook token");
      return res.status(403).send("Forbidden");
    }

    // ✅ 4) Find by clientOrderId (string) – not only by _id
    const order = await Order.findOne({ clientOrderId });
    if (!order) {
      console.warn("❌ Order not found by clientOrderId:", clientOrderId);
      return res.status(200).send("received");
    }

    // ✅ 5) Idempotency: if already paid/preparing, just ack
    if (["paid", "preparing", "delivering", "done"].includes(order.status) || order.paymentStatus === "paid") {
      console.log("ℹ️ Webhook duplicate / already processed for:", clientOrderId);
      return res.status(200).send("ok");
    }

    // ✅ 6) Update fields
    if (isSuccess) {
      order.paymentStatus = "paid";
      // pick one that your Active page shows; 'preparing' usually appears immediately
      order.status = "preparing"; // or "paid" if your /active includes it
      order.paidAt = new Date();

      // Optional: keep structured payment details
      order.paymentDetails = {
        ...(order.paymentDetails || {}),
        provider: "tranzila",
        transaction_id: data.transaction_id,
        auth_number: data.auth_number,
        card_type: data.card_type_name || data.card_type,
        last4: data.last_4,
        token: data.token,
        amount: Number(data.sum || data.amount || order.totalPrice || 0),
        currency: data.currency || data.currency_code || "1",
      };
    } else {
      order.paymentStatus = "failed";
      order.status = "failed";
    }

    // ✅ 7) Always keep raw payload for audit/debug
    order.tranzilaResponse = data;
    await order.save();

    console.log(
      isSuccess
        ? `✅ Order ${clientOrderId} marked as ${order.status.toUpperCase()}`
        : `❌ Payment FAILED for ${clientOrderId}`
    );

    // (Optional) If you have Socket.IO available, emit to admin UI:
    // const { io } = require("../app"); // adjust path if needed
    // io?.emit("order_paid", {
    //   _id: order._id,
    //   clientOrderId: order.clientOrderId,
    //   items: order.items,
    //   totalPrice: order.totalPrice,
    //   status: order.status,
    //   createdAt: order.createdAt,
    // });

    return res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Error in Tranzila webhook handler:", err);
    // Still 200 to avoid infinite retries (unless you want retries)
    return res.status(200).send("received");
  }
});

module.exports = router;
