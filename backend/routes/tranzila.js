const express = require("express");
const router = express.Router();
const axios = require("axios");

const TERMINAL = process.env.TRANZILA_TERMINAL;
const PUBLIC_KEY = process.env.TRANZILA_PUBLIC_KEY;
const SECRET_KEY = process.env.TRANZILA_SECRET_KEY;

router.post("/pay", async (req, res) => {
  const { amount, userId, userPhone } = req.body;

  try {
    const payload = {
      sum: amount,
      user: userId || "guest",
      phone: userPhone || "",
      terminal: TERMINAL,
      // Any other params Tranzila needs...
    };

    const response = await axios.post("https://secure5.tranzila.com/cgi-bin/tranzila31.cgi", payload);

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Payment Error:", error);
    res.status(500).json({ success: false, message: "Payment failed" });
  }
});

module.exports = router;
