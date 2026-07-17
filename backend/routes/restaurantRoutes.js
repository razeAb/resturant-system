const express = require("express");
const router = express.Router();
const Restaurant = require("../models/Restaurant");
const { protect } = require("../middleware/authMiddleware");
const { resolveLocation } = require("../utils/geocode");

// Public: used by the checkout flow to estimate delivery fees client-side
router.get("/", async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(404).json({ message: "❌ No restaurant configured" });
    res.json({
      _id: restaurant._id,
      name: restaurant.name,
      address: restaurant.address,
      deliveryPricing: restaurant.deliveryPricing,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update restaurant address + delivery pricing tiers
router.put("/", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const { name, address, deliveryPricing } = req.body;
    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(404).json({ message: "❌ No restaurant configured" });

    if (typeof name === "string" && name.trim()) restaurant.name = name.trim();

    if (address) {
      const lat = Number(address.lat);
      const lng = Number(address.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "❌ address.lat and address.lng must be valid numbers" });
      }
      restaurant.address = { text: address.text || "", lat, lng };
    }

    if (deliveryPricing) {
      const fields = ["sameCityRadiusKm", "sameCityFee", "nearbyRadiusKm", "nearbyFee"];
      for (const field of fields) {
        if (deliveryPricing[field] === undefined) continue;
        const value = Number(deliveryPricing[field]);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ message: `❌ deliveryPricing.${field} must be a non-negative number` });
        }
        restaurant.deliveryPricing[field] = value;
      }
    }

    await restaurant.save();
    res.json({ message: "✅ Restaurant updated", restaurant });
  } catch (err) {
    console.error("Error updating restaurant:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: resolve a pasted Google Maps link (full or shortened) or plain-text address
// into lat/lng, so the map pin can be set without manually dragging it.
router.post("/resolve-location", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const { input } = req.body;
    if (!input || !String(input).trim()) {
      return res.status(400).json({ message: "❌ input is required" });
    }
    const resolved = await resolveLocation(input);
    if (!resolved) {
      return res.status(404).json({ message: "❌ Could not find a location for that link/address" });
    }
    res.json(resolved);
  } catch (err) {
    console.error("Error resolving location:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
