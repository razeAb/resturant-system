// backend/routes/tranzilaRoute.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const TERMINAL_NAME = process.env.TRANZILA_TERMINAL;
const TRANZILA_PUBLIC_KEY = process.env.TRANZILA_PUBLIC_KEY;
const TRANZILA_SECRET_KEY = process.env.TRANZILA_SECRET_KEY;

// POST /api/pay
router.post("/pay", async (req, res) => {
  const { amount, userId, userPhone } = req.body;

  if (!amount || !userPhone) {
    return res.status(400).json({ error: "Missing amount or userPhone" });
  }

  try {
    const response = await axios.post("https://secure5.tranzila.com/cgi-bin/tranzila31u.cgi", null, {
      params: {
        supplier: TERMINAL_NAME,
        sum: amount,
        currency: 1,
        tranmode: "AK",
        lang: "il",
        phone: userPhone,
        myid: userId || "guest",
      },
      headers: {
        Authorization: `Bearer ${TRANZILA_SECRET_KEY}`,
      },
    });

    // 🧪 Optional: Log or parse response
    return res.status(200).json({ message: "Payment sent", data: response.data });
  } catch (error) {
    console.error("Tranzila Error:", error.message);
    return res.status(500).json({ error: "Payment failed" });
  }
});

module.exports = router;
