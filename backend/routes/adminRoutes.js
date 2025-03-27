const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

// ✅ Get Admin Dashboard Data
router.get("/dashboard", protect, async (req, res) => {
  try {
    // ✅ Ensure the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "❌ Unauthorized access." });
    }

    // ✅ Fetch Users, Products, and Orders
    const users = await User.find().select("name email orderCount points");
    const products = await Product.find().select("name stock price image category");
    const orders = await Order.find().populate("items.product", "name price");

    // ✅ Get Most Frequent Customers (Top 5)
    const topCustomers = users
      .filter((user) => user.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    // ✅ Calculate Total Sales Revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    // ✅ Count how many times each product has been ordered
    const productOrderCounts = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.product?._id?.toString();
        if (productId) {
          productOrderCounts[productId] = (productOrderCounts[productId] || 0) + (item.quantity || 0);
        }
      });
    });

    // ✅ Convert product order count to an array and sort
    const sortedProducts = Object.entries(productOrderCounts)
      .map(([productId, orderCount]) => {
        const product = products.find((p) => p._id.toString() === productId);
        return product ? { product, orderCount } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.orderCount - a.orderCount);

    // ✅ Get Hot & Cold Products
    const hotProducts = sortedProducts.slice(0, 5).map((item) => ({
      name: item.product.name,
      orders: item.orderCount,
    }));

    const coldProducts = sortedProducts.slice(-5).map((item) => ({
      name: item.product.name,
      orders: item.orderCount,
    }));

    // ✅ Return Admin Dashboard Data
    res.status(200).json({
      message: "✅ Admin dashboard data retrieved successfully.",
      users,
      products,
      orders,
      topCustomers,
      totalRevenue,
      lowStockProducts: products.filter((product) => product.stock < 5),
      hotProducts,
      coldProducts,
    });
  } catch (error) {
    console.error("❌ Error retrieving dashboard data:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

module.exports = router;
