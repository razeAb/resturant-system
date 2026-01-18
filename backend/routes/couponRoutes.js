const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");

const computeDiscount = (subtotal, coupon) => {
  if (!coupon || subtotal <= 0) return 0;
  const raw = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return Math.min(raw, subtotal);
};

router.post("/validate", async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
    const priceNumber = Number(subtotal);

    if (!normalizedCode) return res.status(400).json({ message: "קוד קופון חסר" });
    if (!Number.isFinite(priceNumber) || priceNumber < 0) return res.status(400).json({ message: "סכום ביניים לא תקין" });

    const coupon = await Coupon.findOne({ code: normalizedCode, active: true });
    if (!coupon) return res.status(404).json({ message: "קוד קופון לא תקין" });

    const discount = computeDiscount(priceNumber, coupon);
    res.json({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: Number(discount.toFixed(2)),
    });
  } catch (error) {
    console.error("❌ Error validating coupon:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

module.exports = router;
