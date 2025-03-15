const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const mongoose = require("mongoose");

// ✅ Create a New Order
router.post("/", async (req, res) => {
  try {
    let { userId, items, totalPrice } = req.body;

    // ✅ Validate input fields
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

    // ✅ Update User's Order List, Count, and Points
    const user = await User.findById(userId);
    if (user) {
      user.orders.push(newOrder._id);
      
      // ✅ Ensure `orderCount` and `points` exist before incrementing
      user.orderCount = (user.orderCount || 0) + 1; // Safely increment or initialize
      user.points = (user.points || 0) + 10; // Add 10 points per order
      
      await user.save();
      
      // ✅ Reward System
      let rewardMessage = "";
      if (user.orderCount >= 10) {
        rewardMessage = "🎉 Congrats! Your next **meal is free!**";
        user.points += 50; // Bonus points for reaching 10 orders
        await user.save();
      } else if (user.points >= 100) {
        rewardMessage = "🎉 You have earned a **free side dish!**";
      }

      res.status(201).json({
        message: "✅ Order created successfully.",
        order: newOrder,
        user: { orderCount: user.orderCount, points: user.points },
        rewardMessage: rewardMessage
      });
    } else {
      // If user not found, return success for order but note user update failed
      res.status(201).json({
        message: "✅ Order created successfully, but user not found for updating rewards.",
        order: newOrder
      });
    }
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get All Orders (Admin Only)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email orderCount points") // ✅ Include order count and points
      .populate("items.product", "name price");

    res.status(200).json({ message: "✅ All orders fetched successfully.", orders });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
