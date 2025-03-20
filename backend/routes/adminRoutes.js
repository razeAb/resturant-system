const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware"); // ✅ Import protect middleware
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
    const products = await Product.find().select("name stock price");
    const orders = await Order.find().populate("items.product", "name price");

    // ✅ Get Most Frequent Customers (Top 5)
    const topCustomers = users
      .filter((user) => user.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount) // Sort by most orders
      .slice(0, 5);

    // ✅ Calculate Total Sales Revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    // ✅ Calculate Product Sales Count
    let productSalesMap = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.product._id.toString();
        if (!productSalesMap[productId]) {
          productSalesMap[productId] = { 
            name: item.product.name, 
            totalSold: 0 
          };
        }
        productSalesMap[productId].totalSold += item.quantity;
      });
    });

    // ✅ Convert to Array and Sort Products by Sales
    const sortedProducts = Object.values(productSalesMap).sort((a, b) => b.totalSold - a.totalSold);

    // ✅ Get Hot & Cold Products
    const hotProducts = sortedProducts.slice(0, 5); // Top 5 best-selling
    const coldProducts = sortedProducts.slice(-5).reverse(); // Bottom 5 least-selling

    // ✅ Return Admin Dashboard Data
    res.status(200).json({
      message: "✅ Admin dashboard data retrieved successfully.",
      users,
      products,
      orders,
      topCustomers,
      totalRevenue,
      lowStockProducts: products.filter((product) => product.stock < 5),
      hotProducts, // 🔥 Best-selling products
      coldProducts, // ❄️ Least-selling products
    });
  } catch (error) {
    console.error("❌ Error retrieving dashboard data:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

module.exports = router;
