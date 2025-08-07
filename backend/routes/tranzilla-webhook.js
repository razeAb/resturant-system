const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Order = require("../models/Order");

router.post("/tranzila-webhook", express.text({ type: "*/*" }), async (req, res) => {
  try {
    console.log("📬 HEADERS:", req.headers);
    console.log("📩 RAW BODY:", req.body);

    // Parse the raw body
    const parsed = new URLSearchParams(req.body);
    const data = Object.fromEntries(parsed.entries());

    console.log("📩 Parsed Tranzila Webhook Data:", data);

    const orderId = data.orderId;
    const responseCode = data.Response;
    const isSuccess = responseCode === "000";

    console.log("🧾 Received orderId:", orderId);
    console.log("🧾 Is valid ObjectId:", mongoose.Types.ObjectId.isValid(orderId));
    console.log("🎯 Response Code:", responseCode);

    // Optional token verification
    const receivedToken = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && receivedToken !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("❌ Invalid webhook token");
      return res.status(403).send("Forbidden");
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.warn("⚠️ Invalid orderId format:", orderId);
      return res.status(400).send("Invalid orderId");
    }

    // Find the order
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
    } else {
      order.paymentStatus = "failed";
      order.status = "failed";
    }

    // Save full response regardless of success/failure
    order.tranzilaResponse = data;
    await order.save();

    console.log(isSuccess ? `✅ Order marked as PAID: ${orderId}` : `❌ Payment failed (Response: ${responseCode}) for order: ${orderId}`);

    return res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("❌ Error in webhook handler:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
