const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const { protect } = require("../middleware/authMiddleware");
const { driverProtect } = require("../middleware/driverAuthMiddleware");
const { claimOrderForDriver } = require("../utils/driverNotifications");
const jwt = require("jsonwebtoken");

const generateToken = (id) => jwt.sign({ driverId: id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// Admin: create driver
router.post("/", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
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

// Admin: list drivers
router.get("/", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const drivers = await Driver.find().select("-password").sort({ createdAt: -1 });
    res.json({ drivers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: delete driver
router.delete("/:id", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
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
    const orders = await Order.find({
      restaurant: req.user.restaurant,
      deliveryOption: "Delivery",
      "delivery.status": "broadcasting",
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
    const order = await claimOrderForDriver(req.params.id, req.user._id);
    if (!order) {
      return res.status(409).json({ message: "❌ Order already claimed by another driver" });
    }
    res.json({ order });
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

// Driver: mark the claimed order as picked up from the restaurant
router.post("/orders/:id/picked-up", driverProtect, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, "delivery.driver": req.user._id, "delivery.status": "claimed" },
      { $set: { "delivery.status": "picked_up", "delivery.pickedUpAt": new Date(), status: "delivering" } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "❌ Order not found or not yours to pick up" });
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
    order.status = "done";
    await order.save();

    await Driver.updateOne({ _id: req.user._id }, { $set: { currentOrder: null } });

    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
