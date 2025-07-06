const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

// ✅ Get Admin Dashboard Data
router.get("/dashboard", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "❌ Unauthorized access." });
    }

    const users = await User.find().select("name email orderCount points");
    const products = await Product.find().select("name stock price image category isActive additions");
    const orders = await Order.find().populate("items.product", "name price");

    const topCustomers = users
      .filter((user) => user.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    const productOrderCounts = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.product?._id?.toString();
        if (productId) {
          productOrderCounts[productId] = (productOrderCounts[productId] || 0) + (item.quantity || 0);
        }
      });
    });

    const sortedProducts = Object.entries(productOrderCounts)
      .map(([productId, orderCount]) => {
        const product = products.find((p) => p._id.toString() === productId);
        return product ? { product, orderCount } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.orderCount - a.orderCount);

    const hotProducts = sortedProducts.slice(0, 5).map((item) => ({
      name: item.product.name,
      orders: item.orderCount,
    }));

    const coldProducts = sortedProducts
      .slice(-5)
      .reverse()
      .map((item) => ({
        name: item.product.name,
        orders: item.orderCount,
      }));

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

// ✅ Calculate collection totals for a date range
router.get("/collections", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "❌ Unauthorized access." });
    }

    let { startDate, endDate } = req.query;
    const now = new Date();
    if (!startDate) {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = first.toISOString().split("T")[0];
    }
    if (!endDate) {
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate = last.toISOString().split("T")[0];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
    });

    let totalCommission = 0;
    orders.forEach((order) => {
      const rate = order.deliveryOption === "Delivery" ? 0.08 : 0.05;
      totalCommission += order.totalPrice * rate;
    });

    res.json({ startDate, endDate, totalCommission });
  } catch (error) {
    console.error("❌ Error calculating collections:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

module.exports = router;
