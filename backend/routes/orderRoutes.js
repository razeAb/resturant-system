const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// ✅ Create a New Order
router.post("/", async (req, res) => {
  try {
    let { userId, items, totalPrice } = req.body;

    if (!userId || !items || items.length === 0 || !totalPrice) {
      return res.status(400).json({ message: "❌ All fields are required." });
    }

    userId = new mongoose.Types.ObjectId(userId);
    items = items.map((item) => ({
      product: new mongoose.Types.ObjectId(item.product),
      quantity: item.quantity,
    }));

    // ✅ Check stock for each product
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: "❌ Product not found." });
      }

      if (item.quantity < 100) {
        return res.status(400).json({ message: "❌ Minimum order is 100 grams." });
      }

      const quantityInKg = item.quantity / 1000;
      if (product.stock < quantityInKg) {
        return res.status(400).json({ message: `❌ Not enough stock for ${product.name}` });
      }
    }

    // ✅ Deduct stock
    for (let item of items) {
      const product = await Product.findById(item.product);
      const quantityInKg = item.quantity / 1000;
      product.stock -= quantityInKg;
      await product.save();
    }

    // ✅ Create Order
    const newOrder = new Order({ user: userId, items, totalPrice });
    await newOrder.save();

    // ✅ Update user
    const user = await User.findById(userId);
    if (user) {
      user.orders.push(newOrder._id);
      user.orderCount = (user.orderCount || 0) + 1;
      user.points = (user.points || 0) + 10;
      await user.save();

      // ✅ Reward Message
      let rewardMessage = "";
      if (user.orderCount >= 10) {
        rewardMessage = "🎉 Congrats! Your next meal is free!";
        user.points += 50;
        await user.save();
      } else if (user.points >= 100) {
        rewardMessage = "🎉 You've earned a free side dish!";
      }

      // ✅ Check for low stock after all deductions
      const allProducts = await Product.find();
      const lowStockProducts = allProducts.filter((p) => p.stock < 5);
      if (lowStockProducts.length > 0) {
        console.log(`⚠️ Low Stock: ${lowStockProducts.map((p) => p.name).join(", ")}`);
      }

      return res.status(201).json({
        message: "✅ Order created successfully.",
        order: newOrder,
        user: { orderCount: user.orderCount, points: user.points },
        rewardMessage,
      });
    }

    res.status(201).json({
      message: "✅ Order created, but user not found for rewards update.",
      order: newOrder,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get All Orders (Admin Only)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "name email orderCount points").populate("items.product", "name price");

    res.status(200).json({ message: "✅ All orders fetched successfully.", orders });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
