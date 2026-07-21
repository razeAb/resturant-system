const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Driver = require("../models/Driver");
const Restaurant = require("../models/Restaurant");
const { protect, ensureAnyAdmin } = require("../middleware/authMiddleware");
const { getIo } = require("../utils/driverNotifications");
const { searchSettlements, getSettlementBoundary } = require("../utils/geocode");

// Delivery-platform "Admin Mode" (inside the driver app) - separate from the restaurant's
// own web admin dashboard. Every route here needs either isAdmin or isPlatformAdmin.
router.use(protect, (req, res, next) => {
  if (!ensureAnyAdmin(req, res)) return;
  next();
});

const ACTIVE_DELIVERY_STATUSES = ["claimed", "arrived_at_restaurant", "picked_up"];
const DELIVERY_STATUS_ENUM = [
  "none",
  "broadcasting",
  "claimed",
  "arrived_at_restaurant",
  "picked_up",
  "delivered",
  "customer_unavailable",
  "returned_to_restaurant",
  "canceled",
];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Dashboard summary tiles - computed straight from existing Driver/Order fields, no new
// schema needed. "Failed today" uses the order's own createdAt (there's no dedicated
// canceledAt timestamp), so it's an approximation of "today" rather than exact.
router.get("/dashboard", async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(500).json({ message: "❌ No restaurant configured" });

    const since = startOfToday();

    const [driversOnline, driversDelivering, deliveriesWaiting, activeDeliveries, completedToday, failedToday, feesAgg] =
      await Promise.all([
        Driver.countDocuments({ restaurant: restaurant._id, online: true }),
        Driver.countDocuments({ restaurant: restaurant._id, online: true, currentOrder: { $ne: null } }),
        Order.countDocuments({ restaurant: restaurant._id, deliveryOption: "Delivery", "delivery.status": "broadcasting" }),
        Order.countDocuments({
          restaurant: restaurant._id,
          deliveryOption: "Delivery",
          "delivery.status": { $in: ACTIVE_DELIVERY_STATUSES },
        }),
        Order.countDocuments({ restaurant: restaurant._id, "delivery.status": "delivered", "delivery.deliveredAt": { $gte: since } }),
        Order.countDocuments({
          restaurant: restaurant._id,
          "delivery.status": { $in: ["canceled", "customer_unavailable"] },
          createdAt: { $gte: since },
        }),
        Order.aggregate([
          { $match: { restaurant: restaurant._id, "delivery.status": "delivered", "delivery.deliveredAt": { $gte: since } } },
          { $group: { _id: null, total: { $sum: "$delivery.driverEarning" } } },
        ]),
      ]);

    res.json({
      driversOnline,
      driversDelivering,
      driversAvailable: Math.max(driversOnline - driversDelivering, 0),
      deliveriesWaiting,
      activeDeliveries,
      completedToday,
      failedToday,
      totalFeesToday: feesAgg[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Live Deliveries list - "active" = currently in flight, "today" = everything from today
// regardless of status (so completed/cancelled/problem ones are still visible).
router.get("/deliveries", async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(500).json({ message: "❌ No restaurant configured" });

    const query = { restaurant: restaurant._id, deliveryOption: "Delivery" };
    if (req.query.filter === "today") {
      query.createdAt = { $gte: startOfToday() };
    } else {
      query["delivery.status"] = { $in: ["broadcasting", ...ACTIVE_DELIVERY_STATUSES] };
    }

    const orders = await Order.find(query).populate("delivery.driver", "name phone").sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single delivery, full detail - the event timeline is built client-side from the
// existing timestamp fields (broadcastAt/claimedAt/arrivedAt/pickedUpAt/deliveredAt),
// no separate event-log collection needed.
router.get("/deliveries/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("delivery.driver", "name phone vehicleType vehiclePlate")
      .populate("restaurant", "name phone address")
      .lean();
    if (!order) return res.status(404).json({ message: "❌ Delivery not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Force-assign a specific driver, bypassing the normal broadcast/claim race - for when
// nobody accepts a broadcasting delivery on their own.
router.post("/deliveries/:id/assign", async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ message: "❌ driverId is required" });

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: "❌ Driver not found" });
    if (!driver.online) return res.status(400).json({ message: "❌ Driver is not online" });
    if (driver.currentOrder) return res.status(400).json({ message: "❌ Driver already has an active delivery" });

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, "delivery.status": { $in: ["none", "broadcasting"] } },
      { $set: { "delivery.driver": driverId, "delivery.status": "claimed", "delivery.claimedAt": new Date() } },
      { new: true }
    );
    if (!order) {
      return res.status(409).json({ message: "❌ Delivery isn't available to assign (already claimed, or not broadcasting)" });
    }

    await Driver.updateOne({ _id: driverId }, { $set: { currentOrder: order._id } });
    getIo()?.emit?.("delivery:claimed", { orderId: String(order._id), driverId: String(driverId) });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove the assigned driver and reopen the delivery to all matching drivers.
router.post("/deliveries/:id/unassign", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "❌ Delivery not found" });
    const previousDriver = order.delivery.driver;

    order.delivery.driver = null;
    order.delivery.status = "broadcasting";
    order.delivery.claimedAt = null;
    await order.save();

    if (previousDriver) await Driver.updateOne({ _id: previousDriver }, { $set: { currentOrder: null } });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel a delivery outright, freeing any assigned driver.
router.post("/deliveries/:id/cancel", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "❌ Delivery not found" });
    const previousDriver = order.delivery.driver;

    order.delivery.status = "canceled";
    order.status = "canceled";
    await order.save();

    if (previousDriver) await Driver.updateOne({ _id: previousDriver }, { $set: { currentOrder: null } });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manual override for a stuck delivery status.
router.put("/deliveries/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!DELIVERY_STATUS_ENUM.includes(status)) {
      return res.status(400).json({ message: "❌ Invalid delivery status" });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: { "delivery.status": status } }, { new: true });
    if (!order) return res.status(404).json({ message: "❌ Delivery not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: search cities/villages (for editing a driver's zones from admin mode) - same
// Google-first search used by the driver app itself, just gated by ensureAnyAdmin instead
// of driverProtect since admin mode authenticates as a User, not a Driver.
router.get("/search-settlements", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ results: [] });
    const results = await searchSettlements(q);
    res.json({ results: results.filter((r) => r.placeId) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: real village/town outline for a point - mirrors the driver-facing equivalent.
router.get("/settlement-boundary", async (req, res) => {
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

// Admin: delivered orders with driver payout info, filterable by driver and paid status -
// the data (driverEarning, driverPayoutStatus, cashCollected) already exists on Order,
// this just surfaces it for the Payments screen.
router.get("/payments", async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne();
    if (!restaurant) return res.status(500).json({ message: "❌ No restaurant configured" });

    const query = { restaurant: restaurant._id, "delivery.status": "delivered" };
    if (req.query.driverId) query["delivery.driver"] = req.query.driverId;
    if (req.query.paid === "paid") query["delivery.driverPayoutStatus"] = "paid";
    if (req.query.paid === "unpaid") query["delivery.driverPayoutStatus"] = { $in: ["owed", "self_collected"] };

    const orders = await Order.find(query).populate("delivery.driver", "name").sort({ "delivery.deliveredAt": -1 }).lean();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: mark a card order's driver payout as settled - the only route that ever sets
// driverPayoutStatus to "paid" (previously nothing did, so card-order earnings sat as
// "owed" forever).
router.post("/payments/:id/mark-paid", async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, "delivery.driverPayoutStatus": "owed" },
      { $set: { "delivery.driverPayoutStatus": "paid" } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "❌ Payment not found or not currently owed" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
