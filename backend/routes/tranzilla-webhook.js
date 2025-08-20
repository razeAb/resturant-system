const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { io } = require("../server"); // <-- make sure the path points to where you export io

// If you use global app-level parsers, you could use urlencoded here.
// Keeping text parser to be safe with Tranzila payloads.
router.post("/tranzila-webhook", express.text({ type: "*/*" }), async (req, res) => {
  try {
    console.log("📬 Webhook headers:", req.headers);
    console.log("📩 Raw Tranzila body:", req.body);

    // Parse x-www-form-urlencoded-like body to object
    const parsed = new URLSearchParams(req.body || "");
    const data = Object.fromEntries(parsed.entries());
    console.log("📩 Parsed Tranzila Webhook Data:", data);

    // 1) success detection
    const isSuccess = data.processor_response_code === "000" || data.Response === "000" || data.response === "000";

    // 2) stable id we sent as ud1
    const clientOrderId = data.ud1 || data.orderId || data.order_id || data.clientOrderId || null;
    if (!clientOrderId) {
      console.warn("⚠️ Success but missing clientOrderId (ud1).");
      return res.status(200).send("received");
    }

    // 3) optional token
    const receivedToken = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && receivedToken !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("❌ Invalid webhook token");
      return res.status(403).send("Forbidden");
    }

    // 4) find the pre-payment order by clientOrderId
    const order = await Order.findOne({ clientOrderId });
    if (!order) {
      console.warn("❌ Order not found by clientOrderId:", clientOrderId);
      return res.status(200).send("received");
    }

    // 5) idempotency
    if (["paid", "preparing", "delivering", "done"].includes(order.status) || order.paymentStatus === "paid") {
      console.log("ℹ️ Duplicate webhook for:", clientOrderId);
      return res.status(200).send("ok");
    }

    // 6) update order
    if (isSuccess) {
      order.paymentStatus = "paid";
      order.status = "preparing"; // or "paid" if your /active includes it
      order.paidAt = new Date();

      // ✅ keep the original method (e.g., "Card") and merge details
      const prevMethod = data.payment_method || order.paymentDetails?.method || "Card";
      order.paymentDetails = {
        ...(order.paymentDetails || {}),
        method: prevMethod,
        provider: "tranzila",
        transaction_id: data.transaction_id,
        auth_number: data.auth_number,
        card_type: data.card_type_name || data.card_type,
        last4: data.last_4,
        token: data.token,
        amount: Number(data.sum || data.amount || order.totalPrice || 0),
        currency: data.currency || data.currency_code || "1",
        raw: data,
      };
    } else {
      order.paymentStatus = "failed";
      order.status = "failed";
    }

    // 7) keep raw payload for audit/debug
    order.tranzilaResponse = data;
    await order.save();

    console.log(isSuccess ? `✅ Order ${clientOrderId} marked as ${order.status.toUpperCase()}` : `❌ Payment FAILED for ${clientOrderId}`);

    // 🔔 push to admin UI in real-time
    if (isSuccess && io?.emit) {
      io.emit("order_paid", {
        _id: order._id,
        clientOrderId: order.clientOrderId,
        items: order.items,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt,
        deliveryOption: order.deliveryOption,
        customerName: order.customerName,
        phone: order.phone,
        paymentDetails: order.paymentDetails, // so UI shows the method
      });
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Error in Tranzila webhook handler:", err);
    return res.status(200).send("received");
  }
});

module.exports = router;
