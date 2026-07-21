const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const { searchSettlements, getSettlementBoundary } = require("../utils/geocode");
const { protect, ensureAnyAdmin } = require("../middleware/authMiddleware");
const { driverProtect } = require("../middleware/driverAuthMiddleware");
const { claimOrderForDriver, getIo } = require("../utils/driverNotifications");
const jwt = require("jsonwebtoken");

const generateToken = (id) => jwt.sign({ driverId: id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// Admin: create driver
router.post("/", protect, async (req, res) => {
  if (!ensureAnyAdmin(req, res)) return;
  try {
    const { username, password, name, phone } = req.body;
    if (!username || !password || !name) return res.status(400).json({ message: "❌ All fields are required" });
    const exists = await Driver.findOne({ username });
    if (exists) return res.status(400).json({ message: "❌ Username already exists" });

    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(500).json({ message: "❌ No restaurant configured" });

    const driver = await Driver.create({ username, password, name, phone, restaurant: restaurant._id });
    const safeDriver = driver.toObject();
    delete safeDriver.password;
    res.status(201).json({ message: "✅ Driver created", driver: safeDriver });
  } catch (err) {
    console.error("Error creating driver:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: list drivers, enriched with a lifetime completed/cancelled/earnings summary
// (one aggregation across all drivers, not N+1 queries) - purely additive to the response
// shape, so existing consumers (the web ManageDrivers.jsx) are unaffected.
router.get("/", protect, async (req, res) => {
  if (!ensureAnyAdmin(req, res)) return;
  try {
    const drivers = await Driver.find().select("-password").sort({ createdAt: -1 }).lean();
    const stats = await Order.aggregate([
      { $match: { "delivery.driver": { $ne: null }, "delivery.status": { $in: ["delivered", "canceled", "customer_unavailable"] } } },
      {
        $group: {
          _id: "$delivery.driver",
          completed: { $sum: { $cond: [{ $eq: ["$delivery.status", "delivered"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $in: ["$delivery.status", ["canceled", "customer_unavailable"]] }, 1, 0] } },
          earnings: { $sum: { $cond: [{ $eq: ["$delivery.status", "delivered"] }, "$delivery.driverEarning", 0] } },
        },
      },
    ]);
    const statsById = new Map(stats.map((s) => [String(s._id), s]));
    const driversWithStats = drivers.map((d) => ({
      ...d,
      stats: statsById.get(String(d._id)) || { completed: 0, cancelled: 0, earnings: 0 },
    }));
    res.json({ drivers: driversWithStats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: delete driver
router.delete("/:id", protect, async (req, res) => {
  if (!ensureAnyAdmin(req, res)) return;
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: "❌ Driver not found" });
    await driver.deleteOne();
    res.json({ message: "✅ Driver removed" });
  } catch (err) {
    console.error("Error deleting driver:", err);
    res.status(500).json({ message: err.message });
  }
});

// Driver login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const driver = await Driver.findOne({ username });
    if (!driver || !(await driver.matchPassword(password))) {
      return res.status(400).json({ message: "❌ Invalid credentials" });
    }
    const token = generateToken(driver._id);
    res.json({
      message: "✅ Logged in",
      token,
      driver: {
        _id: driver._id,
        username: driver.username,
        name: driver.name,
        phone: driver.phone,
        online: driver.online,
        currentOrder: driver.currentOrder,
        zones: driver.zones,
        vehicleType: driver.vehicleType,
        vehiclePlate: driver.vehiclePlate,
        active: driver.active,
      },
    });
  } catch (err) {
    console.error("Driver login error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Driver: get own profile
router.get("/me", driverProtect, async (req, res) => {
  res.json(req.user);
});

// Driver: toggle online/offline
router.post("/online", driverProtect, async (req, res) => {
  try {
    const online = !!req.body.online;
    const driver = await Driver.findByIdAndUpdate(req.user._id, { online, lastSeenAt: new Date() }, { new: true }).select("-password");
    res.json({ driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: set which areas they're willing to work - picked independently via Google
// Places search, not tied to the restaurant's configured pricing zones.
router.put("/zones", driverProtect, async (req, res) => {
  try {
    const input = Array.isArray(req.body.zones) ? req.body.zones : [];
    const seen = new Set();
    const zones = [];
    for (const z of input) {
      const lat = Number(z?.lat);
      const lng = Number(z?.lng);
      if (!z?.placeId || !z?.name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "❌ Each zone needs a placeId, name, lat, and lng" });
      }
      if (seen.has(z.placeId)) continue;
      seen.add(z.placeId);
      zones.push({ placeId: z.placeId, name: z.name, lat, lng, active: z.active !== false, boundary: z.boundary || null });
    }
    const driver = await Driver.findByIdAndUpdate(req.user._id, { zones }, { new: true }).select("-password");
    res.json({ driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: search cities/villages via Google Places (+ fallbacks) to add as a work area.
// Only Google-backed results carry a real placeId, which is required to save a zone.
router.get("/search-settlements", driverProtect, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ results: [] });
    const results = await searchSettlements(q);
    res.json({ results: results.filter((r) => r.placeId) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: real village/town outline (from OSM) around a point, for a purely visual outline
// on the driver's own zone map - mirrors the admin's /api/restaurant/settlement-boundary.
router.get("/settlement-boundary", driverProtect, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "❌ lat and lng are required" });
    }
    const boundary = await getSettlementBoundary(lat, lng);
    if (!boundary) return res.status(404).json({ message: "❌ No settlement boundary found for that point" });
    res.json({ name: boundary.name, geojson: boundary.geojson });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: place IDs of zones currently covered by at least one online driver, used by
// checkout to warn the customer when the fee can't be auto-computed for their address.
router.get("/online-zones", async (req, res) => {
  try {
    const onlineDrivers = await Driver.find({ online: true }, "zones").lean();
    const zonePlaceIds = new Set();
    for (const driver of onlineDrivers) {
      for (const zone of driver.zones || []) {
        if (zone.active !== false) zonePlaceIds.add(zone.placeId);
      }
    }
    res.json({ zonePlaceIds: [...zonePlaceIds] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: register a push token for this device (idempotent)
router.post("/push-token", driverProtect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "❌ token is required" });
    await Driver.updateOne({ _id: req.user._id }, { $addToSet: { expoPushTokens: token } });
    res.json({ message: "✅ Token registered" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: list orders currently broadcasting for this driver's restaurant (polling fallback for missed push)
router.get("/orders/available", driverProtect, async (req, res) => {
  try {
    // Requires both ends of the trip - the restaurant's own location and the customer's -
    // to fall within the driver's active work areas.
    const activePlaceIds = (req.user.zones || []).filter((z) => z.active !== false).map((z) => z.placeId);
    const orders = await Order.find({
      restaurant: req.user.restaurant,
      deliveryOption: "Delivery",
      "delivery.status": "broadcasting",
      deliveryZonePlaceId: { $in: activePlaceIds },
      restaurantZonePlaceId: { $in: activePlaceIds },
      "delivery.declinedBy": { $ne: req.user._id },
    }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: claim a broadcasting order (first to accept wins)
router.post("/orders/:id/claim", driverProtect, async (req, res) => {
  try {
    if (req.user.currentOrder) {
      return res.status(400).json({ message: "❌ You already have an active delivery" });
    }
    const target = await Order.findById(req.params.id).select("deliveryZonePlaceId restaurantZonePlaceId");
    const activePlaceIds = new Set((req.user.zones || []).filter((z) => z.active !== false).map((z) => z.placeId));
    const covers = target && activePlaceIds.has(target.deliveryZonePlaceId) && activePlaceIds.has(target.restaurantZonePlaceId);
    if (!covers) {
      return res.status(403).json({ message: "❌ This order is outside your selected zones" });
    }
    const order = await claimOrderForDriver(req.params.id, req.user._id);
    if (!order) {
      return res.status(409).json({ message: "❌ Order already claimed by another driver" });
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: decline a broadcasting order - it stays visible to every other driver, just not this one
router.post("/orders/:id/decline", driverProtect, async (req, res) => {
  try {
    await Order.updateOne({ _id: req.params.id }, { $addToSet: { "delivery.declinedBy": req.user._id } });
    res.json({ message: "✅ Declined" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: active + history orders for this driver
router.get("/orders/mine", driverProtect, async (req, res) => {
  try {
    const orders = await Order.find({ "delivery.driver": req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: mark that they've physically arrived at the restaurant to collect the order
router.post("/orders/:id/arrived", driverProtect, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, "delivery.driver": req.user._id, "delivery.status": "claimed" },
      { $set: { "delivery.status": "arrived_at_restaurant", "delivery.arrivedAt": new Date() } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "❌ Order not found or not yours" });
    getIo()?.emit?.("delivery:arrived", { orderId: String(order._id) });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: mark the claimed order as picked up from the restaurant
router.post("/orders/:id/picked-up", driverProtect, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, "delivery.driver": req.user._id, "delivery.status": "arrived_at_restaurant" },
      { $set: { "delivery.status": "picked_up", "delivery.pickedUpAt": new Date(), status: "delivering" } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "❌ Order not found or not yours to pick up" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: report that the customer wasn't reachable/available at the delivery address -
// frees them up to take other deliveries rather than being stuck on this one indefinitely.
router.post("/orders/:id/customer-unavailable", driverProtect, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, "delivery.driver": req.user._id, "delivery.status": "picked_up" },
      { $set: { "delivery.status": "customer_unavailable", "delivery.driverNote": req.body.note || "" } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "❌ Order not found or not yours" });
    await Driver.updateOne({ _id: req.user._id }, { $set: { currentOrder: null } });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: mark the claimed order as delivered
router.post("/orders/:id/delivered", driverProtect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, "delivery.driver": req.user._id, "delivery.status": "picked_up" });
    if (!order) return res.status(404).json({ message: "❌ Order not found or not yours to deliver" });

    const isCash = order.paymentDetails?.method === "Cash";
    if (isCash && !req.body.cashCollected) {
      return res.status(400).json({ message: "❌ Must confirm cash collected for Cash orders" });
    }

    order.delivery.status = "delivered";
    order.delivery.deliveredAt = new Date();
    order.delivery.cashCollected = isCash ? true : false;
    order.delivery.cashCollectedAt = isCash ? new Date() : null;
    order.delivery.driverEarning = order.deliveryFee;
    order.delivery.driverPayoutStatus = isCash ? "self_collected" : "owed";
    order.status = "done";
    await order.save();

    await Driver.updateOne({ _id: req.user._id }, { $set: { currentOrder: null } });

    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: today/week/month earnings totals + per-delivery breakdown.
// There's only one restaurant in this system, so a single findOne() covers every row's name.
router.get("/orders/earnings", driverProtect, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [delivered, restaurant] = await Promise.all([
      Order.find({ "delivery.driver": req.user._id, "delivery.status": "delivered" }).sort({ "delivery.deliveredAt": -1 }),
      Restaurant.findOne(),
    ]);

    const sumSince = (since) =>
      delivered
        .filter((o) => o.delivery.deliveredAt && o.delivery.deliveredAt >= since)
        .reduce((sum, o) => sum + (o.delivery.driverEarning || 0), 0);

    const deliveries = delivered.map((o) => ({
      orderId: o._id,
      restaurantName: restaurant?.name || "",
      amount: o.delivery.driverEarning || 0,
      deliveredAt: o.delivery.deliveredAt,
      paymentMethod: o.paymentDetails?.method || null,
      payoutStatus: o.delivery.driverPayoutStatus,
    }));

    res.json({
      today: sumSince(startOfToday),
      week: sumSince(startOfWeek),
      month: sumSince(startOfMonth),
      completedToday: delivered.filter((o) => o.delivery.deliveredAt && o.delivery.deliveredAt >= startOfToday).length,
      deliveries,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver: self-edit vehicle info (name/phone stay admin-managed via the driver-management screen)
router.put("/me", driverProtect, async (req, res) => {
  try {
    const { vehicleType, vehiclePlate } = req.body;
    const update = {};
    if (typeof vehicleType === "string") update.vehicleType = vehicleType.trim();
    if (typeof vehiclePlate === "string") update.vehiclePlate = vehiclePlate.trim();
    const driver = await Driver.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
    res.json({ driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: edit a driver's name/phone, and suspend/reactivate their account. Registered
// last so this ":id" pattern can't shadow the more specific named routes above it
// (e.g. PUT /zones, PUT /me) that Express would otherwise match against it first.
router.put("/:id", protect, async (req, res) => {
  if (!ensureAnyAdmin(req, res)) return;
  try {
    const { name, phone, active } = req.body;
    const update = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof phone === "string") update.phone = phone.trim();
    if (typeof active === "boolean") update.active = active;
    const driver = await Driver.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
    if (!driver) return res.status(404).json({ message: "❌ Driver not found" });
    res.json({ message: "✅ Driver updated", driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: force a driver offline (distinct from the driver's own self-toggle) - useful
// when a driver has gone silent but their app hasn't told the server they're offline.
router.post("/:id/force-offline", protect, async (req, res) => {
  if (!ensureAnyAdmin(req, res)) return;
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, { online: false }, { new: true }).select("-password");
    if (!driver) return res.status(404).json({ message: "❌ Driver not found" });
    res.json({ message: "✅ Driver set offline", driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: reset a driver's password directly - the model's pre("save") hook hashes it.
router.post("/:id/reset-password", protect, async (req, res) => {
  if (!ensureAnyAdmin(req, res)) return;
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({ message: "❌ newPassword must be at least 4 characters" });
    }
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: "❌ Driver not found" });
    driver.password = newPassword;
    await driver.save();
    res.json({ message: "✅ Password reset" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: edit a specific driver's work areas - same validation as the driver's own
// PUT /zones, just targeting an arbitrary driver id instead of req.user.
router.put("/:id/zones", protect, async (req, res) => {
  if (!ensureAnyAdmin(req, res)) return;
  try {
    const input = Array.isArray(req.body.zones) ? req.body.zones : [];
    const seen = new Set();
    const zones = [];
    for (const z of input) {
      const lat = Number(z?.lat);
      const lng = Number(z?.lng);
      if (!z?.placeId || !z?.name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "❌ Each zone needs a placeId, name, lat, and lng" });
      }
      if (seen.has(z.placeId)) continue;
      seen.add(z.placeId);
      zones.push({ placeId: z.placeId, name: z.name, lat, lng, active: z.active !== false, boundary: z.boundary || null });
    }
    const driver = await Driver.findByIdAndUpdate(req.params.id, { zones }, { new: true }).select("-password");
    if (!driver) return res.status(404).json({ message: "❌ Driver not found" });
    res.json({ driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
