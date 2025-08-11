const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Order = require("../models/Order");

// Handle Tranzila webhook
router.post("/tranzila-webhook", express.text({ type: "*/*" }), async (req, res) => {
  try {
    console.log("📬 Webhook headers:", req.headers);
    console.log("📩 Raw Tranzila body:", req.body);

    // Parse raw URL-encoded string to object
    const parsed = new URLSearchParams(req.body);
    const data = Object.fromEntries(parsed.entries());

    console.log("📩 Parsed Tranzila Webhook Data:", data);

    // Handle multiple possible keys for order ID
    const orderId = data.orderId || data.order_id || data.order;
    const responseCode = data.Response;
    const isSuccess = responseCode === "000";

    console.log("🧾 Received orderId:", orderId);
    console.log("🧾 Is valid ObjectId:", mongoose.Types.ObjectId.isValid(orderId));
    console.log("🎯 Response Code:", responseCode);

    // Optional token protection
    const receivedToken = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && receivedToken !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("❌ Invalid webhook token");
      return res.status(403).send("Forbidden");
    }

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.warn("⚠️ Invalid orderId format:", orderId);
      return res.status(400).send("Invalid orderId");
    }

    // Fetch the order
    const order = await Order.findById(orderId);
    if (!order) {
      console.warn("❌ Order not found:", orderId);
      return res.status(404).send("No valid order");
    }

    // Update based on success/failure
    if (isSuccess) {
      order.paymentStatus = "paid";
      order.status = "paid";
      order.tranzilaToken = data.TranzilaTK || "";
            order.paidAt = new Date();
    } else {
      order.paymentStatus = "failed";
      order.status = "failed";
    }

    // Always save full response
    order.tranzilaResponse = data;
    await order.save();

    console.log(isSuccess ? `✅ Order marked as PAID: ${orderId}` : `❌ Payment FAILED (Response: ${responseCode}) for order: ${orderId}`);

    res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("❌ Error in Tranzila webhook handler:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
