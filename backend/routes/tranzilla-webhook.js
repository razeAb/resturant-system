// routes/tranzilaWebhook.js
const express = require("express");
const mongoose = require("mongoose"); // ✅ Import mongoose
const router = express.Router();
const Order = require("../models/Order");

// ✅ Use express.text() to parse raw body (Tranzila sends raw URL-encoded text)
router.post("/tranzila-webhook", express.text({ type: "*/*" }), async (req, res) => {
  try {
    console.log("📬 HEADERS:", req.headers);
    console.log("📩 RAW BODY:", req.body);

    // ✅ Parse Tranzila's body (which comes as x-www-form-urlencoded string)
    const parsed = new URLSearchParams(req.body);
    const data = Object.fromEntries(parsed.entries());

    console.log("📩 Parsed Tranzila Webhook Data:", data);

    const orderId = data.orderId;
    console.log("🧾 Received orderId:", orderId);
    console.log("🧾 Is valid ObjectId:", mongoose.Types.ObjectId.isValid(orderId));

    // ✅ Optional: verify Tranzila secret token (if used)
    const receivedToken = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && receivedToken !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("❌ Invalid webhook token");
      return res.status(403).send("Forbidden");
    }

    // ✅ Check that it's a successful payment
    if (data.Response === "000") {
      // ✅ Validate the format of orderId
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        console.warn("⚠️ Invalid orderId format:", orderId);
        return res.status(400).send("Invalid orderId");
      }

      // ✅ Find and update the order
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
        return res.status(404).send("No valid order");
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
