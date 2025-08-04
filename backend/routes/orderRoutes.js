const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User"); // ✅ ADD THIS
const { protect } = require("../middleware/authMiddleware");

// ✅ Create a New Order
router.post("/", async (req, res) => {
  try {
    const { user, items, totalPrice, deliveryOption, status, createdAt, phone, customerName, paymentDetails, couponUsed } = req.body;
    console.log("🟢 totalPrice received at backend:", totalPrice); // Critical debug

    const newOrder = new Order({
      user: user || undefined,
      phone: phone || undefined,
      customerName: customerName || undefined,
      paymentDetails: paymentDetails || {},
      couponUsed: couponUsed || undefined,
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
        if (couponUsed === "drink") {
          foundUser.usedDrinkCoupon = true;
        }
        if (couponUsed === "side") {
          foundUser.orderCount = 0;
          foundUser.usedDrinkCoupon = false;
        } else if (foundUser.orderCount >= 10) {
          foundUser.orderCount = 10; // allow side coupon on next order
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

// ✅ Tranzila payment success callback
router.post("/success", async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log("💳 Payment success received for orderId:", orderId);

    // In this flow the order itself is created on the client after a
    // successful payment, so we simply acknowledge the callback here.
    // If in the future you persist temporary IDs you can update the order
    // status or store additional payment details at this point.

    res.status(200).json({ message: "Payment success recorded" });
  } catch (err) {
    console.error("❌ Error handling payment success:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update order status + estimatedTime if provided
router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, estimatedTime } = req.body;

  try {
    const updateFields = { status };

    if (estimatedTime) {
      updateFields.estimatedTime = estimatedTime;
    }

    const order = await Order.findByIdAndUpdate(id, updateFields, { new: true });
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

router.post("/:id/add-item", async (req, res) => {
  const { id } = req.params;
  const { item, addedPrice } = req.body;

  if (!item) return res.status(400).json({ message: "Item data is required" });

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.items.push(item);
    if (addedPrice) {
      order.totalPrice = parseFloat(order.totalPrice || 0) + parseFloat(addedPrice);
    }

    await order.save();
    res.json(order);
  } catch (error) {
    console.error("❌ Failed to add item to order:", error);
    res.status(500).json({ message: error.message });
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

// Get latest order by phone number
router.get("/phone/:phone", async (req, res) => {
  const { phone } = req.params;
  try {
    // Try to find an order directly by phone
    let order = await Order.findOne({ phone }).sort({ createdAt: -1 });

    // If no direct order found, look up user and fetch their last order
    if (!order) {
      const user = await User.findOne({ phone });
      if (user) {
        order = await Order.findOne({ user: user._id }).sort({ createdAt: -1 });
      }
    }

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("❌ Error fetching order by phone:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get order by MongoDB _id
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name phone").populate("items.product", "name");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    console.error("❌ Error fetching order by ID:", error);
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
