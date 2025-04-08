const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// ✅ Create a New Order
router.post("/", async (req, res) => {
  try {
    const { items, totalPrice, deliveryOption, status, createdAt } = req.body;

    // Validate request body
    if (!items || items.length === 0 || !deliveryOption || !totalPrice) {
      return res.status(400).json({ message: "❌ Missing required fields." });
    }

    // Optional: Validate each item
    for (let item of items) {
      if (!item.product || item.quantity === undefined) {
        return res.status(400).json({ message: "❌ Invalid item format. Missing product or quantity." });
      }
    }

    // Create and save new order
    const newOrder = new Order({
      items,
      totalPrice: parseFloat(totalPrice),
      deliveryOption,
      status: status || "pending",
      createdAt: createdAt || new Date(),
    });

    await newOrder.save();

    res.status(201).json({
      message: "✅ Order created successfully.",
      order: newOrder,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ message: error.message });
  }
});

//Delete order By id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ message: "✅ Order deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete order:", err);
    res.status(500).json({ messgae: err.message });
  }
});

// ✅ Get Active Orders (not marked as done)
router.get("/active", async (req, res) => {
  try {
    const activeOrders = await Order.find({ status: { $ne: "done" } })
      .populate("user", "name phone") // כדי שנקבל שם ומספר
      .populate("items.product", "name") // כדי שנקבל את שם המוצר

      .sort({ createdAt: -1 });

    res.status(200).json(activeOrders);
  } catch (error) {
    console.error("❌ Error fetching active orders:", error);
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
