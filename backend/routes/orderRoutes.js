const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User"); // ✅ ADD THIS
const { protect } = require("../middleware/authMiddleware");

// ✅ Create a New Order
router.post("/", async (req, res) => {
  try {
    const { user, items, totalPrice, deliveryOption, status, createdAt, phone, paymentDetails } = req.body;

    console.log("🟢 totalPrice received at backend:", totalPrice); // Critical debug

    const newOrder = new Order({
      user: user || undefined,
      phone: phone || undefined,
      paymentDetails: paymentDetails || {},
      items,
      totalPrice: parseFloat(totalPrice),
      deliveryOption,
      status: status || "pending",
      createdAt: createdAt || new Date(),
    });

    await newOrder.save();
    console.log("✅ Order saved:", newOrder);

    if (user) {
      const foundUser = await User.findById(user);
      if (foundUser) {
        foundUser.orderCount += 1;
        if (foundUser.orderCount >= 10) {
          foundUser.orderCount = 0; // reset to 0
        }
        await foundUser.save();
      }
    }

    res.status(201).json({
      message: "✅ Order created successfully.",
      order: newOrder,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ message: error.message });
  }
});
// ✅ Update order status
router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Delete order by ID
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ message: "✅ Order deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete order:", err);
    res.status(500).json({ message: err.message }); // 🛠 fixed typo
  }
});

// ✅ Get Active Orders (not marked as done)
router.get("/active", async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 🧠 Step 1: Auto mark old orders as "done"
    await Order.updateMany({ createdAt: { $lte: twentyFourHoursAgo }, status: { $ne: "done" } }, { $set: { status: "done" } });

    // 🧠 Step 2: Fetch still active
    const activeOrders = await Order.find({ status: { $ne: "done" } })
      .populate("user", "name phone")
      .populate("items.product", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(activeOrders);
  } catch (error) {
    console.error("❌ Error fetching active orders:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get Order History
router.get("/history", protect, async (req, res) => {
  try {
    let query = { status: "done" };

    if (!req.user.isAdmin) {
      query.user = req.user._id;
    }

    const orders = await Order.find(query).populate("user", "name phone").populate("items.product", "name").sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get All Orders (Admin)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: "✅ All orders fetched successfully.",
      orders,
    });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
