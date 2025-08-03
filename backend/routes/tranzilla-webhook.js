// routes/tranzilaWebhook.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

router.post("/tranzila-webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Tranzila Webhook Received:", data);

    const receivedToken = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && receivedToken !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("❌ Invalid webhook token");
      return res.status(403).send("Forbidden");
    }

    if (data.Response === "000") {
      const orderId = data.orderId;

      if (!orderId) {
        console.warn("⚠️ Missing orderId in webhook");
        return res.status(400).send("Missing orderId");
      }

      const updated = await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        status: "paid",
        tranzilaToken: data.TranzilaTK || "",
        tranzilaResponse: data,
      });

      if (updated) {
        console.log("✅ Order marked as paid:", orderId);
        return res.status(200).send("OK");
      } else {
        console.warn("❌ Order not found:", orderId);
        return res.status(404).send("Order not found");
      }
    }

    console.warn("❌ Payment failed. Response code:", data.Response);
    res.status(400).send("Payment failed");
  } catch (err) {
    console.error("❌ Error in webhook handler:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
