const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const mongoose = require("mongoose");

// ✅ Create a New Order
router.post("/", async (req, res) => {
  try {
    let { userId, items, totalPrice } = req.body;

    // Validate input fields
    if (!userId || !items || items.length === 0 || !totalPrice) {
      return res.status(400).json({ message: "❌ All fields are required." });
    }

    // ✅ Convert userId and productIds to ObjectId
    userId = new mongoose.Types.ObjectId(userId);
    items = items.map((item) => ({
      product: new mongoose.Types.ObjectId(item.product),
      quantity: item.quantity,
    }));

    // ✅ Create and Save Order
    const newOrder = new Order({ user: userId, items, totalPrice });
    await newOrder.save();

    // ✅ Update User's Order List
    const user = await User.findById(userId);
    if (user) {
      user.orders.push(newOrder._id);
      await user.save();
    }

    res.status(201).json({ message: "✅ Order created successfully.", order: newOrder });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get All Orders (Admin Only)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "name email").populate("items.product", "name price");

    res.status(200).json({ message: "✅ All orders fetched successfully.", orders });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
