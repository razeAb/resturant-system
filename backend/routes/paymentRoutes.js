// backend/routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const { sendTranzilaRequest } = require("../middleware/tranzillaAuth");

router.post("/tranzila", async (req, res) => {
  try {
    const endpoint = "https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi"; // replace if needed
    const requestData = req.body;

    const response = await sendTranzilaRequest(requestData, endpoint);
    res.status(200).json(response);
  } catch (err) {
    console.error("Tranzila request error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to process Tranzila payment request." });
  }
});

module.exports = router;
