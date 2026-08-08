const express = require("express");
const router = express.Router();
const Restaurant = require("../models/Restaurant");
const { protect } = require("../middleware/authMiddleware");
const { resolveLocation, getSettlementBoundary, searchSettlements } = require("../utils/geocode");
const { geocodeRateLimit } = require("../middleware/geocodeRateLimit");

// Public: used by the checkout flow to estimate delivery fees client-side
router.get("/", async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(404).json({ message: "❌ No restaurant configured" });
    res.json({
      _id: restaurant._id,
      name: restaurant.name,
      phone: restaurant.phone,
      address: restaurant.address,
      deliveryZones: restaurant.deliveryZones,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update restaurant address + delivery zones
router.put("/", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const { name, phone, address, deliveryZones } = req.body;
    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(404).json({ message: "❌ No restaurant configured" });

    if (typeof name === "string" && name.trim()) restaurant.name = name.trim();
    if (typeof phone === "string") restaurant.phone = phone.trim();

    if (address) {
      const lat = Number(address.lat);
      const lng = Number(address.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "❌ address.lat and address.lng must be valid numbers" });
      }
      restaurant.address = { text: address.text || "", lat, lng };
    }

    if (Array.isArray(deliveryZones)) {
      const cleaned = [];
      for (const zone of deliveryZones) {
        const lat = Number(zone.lat);
        const lng = Number(zone.lng);
        if (!zone.name || !Number.isFinite(lat) || !Number.isFinite(lng) || !zone.boundary) {
          return res.status(400).json({ message: "❌ Each delivery zone needs a name, lat/lng, and boundary" });
        }
        cleaned.push({ name: zone.name, placeId: zone.placeId || null, lat, lng, boundary: zone.boundary });
      }
      restaurant.deliveryZones = cleaned;
    }

    // The restaurant's own settlement should always be deliverable, without the admin
    // having to separately search for and add it — so it's kept in sync with the
    // address on every save.
    if (Number.isFinite(restaurant.address?.lat) && Number.isFinite(restaurant.address?.lng)) {
      try {
        const homeBoundary = await getSettlementBoundary(restaurant.address.lat, restaurant.address.lng);
        if (homeBoundary && !restaurant.deliveryZones.some((z) => z.name === homeBoundary.name)) {
          // Nominatim gives the real boundary shape but no placeId - without one, drivers
          // (matched by placeId) could never cover the restaurant's own city, so look it
          // up separately via the same Google-first settlement search used elsewhere.
          let placeId = null;
          try {
            const [match] = await searchSettlements(homeBoundary.name);
            placeId = match?.placeId || null;
          } catch (err) {
            console.error("Failed to resolve a placeId for the home settlement", err.message);
          }
          restaurant.deliveryZones.push({
            name: homeBoundary.name,
            placeId,
            lat: restaurant.address.lat,
            lng: restaurant.address.lng,
            boundary: homeBoundary.geojson,
          });
        }
      } catch (err) {
        console.error("Failed to auto-add restaurant's home settlement as a delivery zone", err.message);
      }
    }

    await restaurant.save();

    res.json({ message: "✅ Restaurant updated", restaurant });
  } catch (err) {
    console.error("Error updating restaurant:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: search for a city/village by name, for the "add a delivery area" picker.
// Only Google-backed results carry a real placeId, which driver-order matching requires -
// a GovMap/Nominatim fallback result with no placeId would silently become an unmatchable
// zone, so it's filtered out here exactly like the driver-side search-settlements route.
router.get("/search-settlements", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const results = await searchSettlements(q);
    res.json(results.filter((r) => r.placeId));
  } catch (err) {
    console.error("Error searching settlements:", err);
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

// Public: geocode the address the customer is typing at checkout, so the map pin can follow
// what they typed instead of relying only on device GPS (which is often inaccurate/denied).
// Rate-limited since it's unauthenticated and each call costs a Google Places lookup.
router.post("/geocode-address", geocodeRateLimit, async (req, res) => {
  try {
    const { input } = req.body;
    if (!input || !String(input).trim()) {
      return res.status(400).json({ message: "❌ input is required" });
    }
    const resolved = await resolveLocation(input);
    if (!resolved) {
      return res.status(404).json({ message: "❌ Could not find that address" });
    }
    res.json(resolved);
  } catch (err) {
    console.error("Error geocoding address:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: fetch the real settlement (village/town) boundary shape around a point, so
// the admin can compare it to the delivery-radius circles on the map.
router.get("/settlement-boundary", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "❌ lat and lng query params must be valid numbers" });
    }
    const boundary = await getSettlementBoundary(lat, lng);
    if (!boundary) return res.status(404).json({ message: "❌ No settlement boundary found for that point" });
    res.json(boundary);
  } catch (err) {
    console.error("Error fetching settlement boundary:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
