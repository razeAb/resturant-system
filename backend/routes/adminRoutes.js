const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");

const ensureAdmin = (req, res) => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ message: "❌ Unauthorized access." });
    return false;
  }
  return true;
};

// ✅ Get Admin Dashboard Data
router.get("/dashboard", protect, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const users = await User.find().select("name email orderCount points");
    const products = await Product.find().select(
      "name name_he name_en description description_he description_en stock price image category isActive fullSandwichPrice extraPattyPrice"
    );
    const orders = await Order.find().populate("items.product", "name name_he name_en price");

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
          const qtyToAdd = item.isWeighted ? 1 : item.quantity || 0;
          productOrderCounts[productId] = (productOrderCounts[productId] || 0) + qtyToAdd;
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
      name_he: item.product.name_he,
      name_en: item.product.name_en,
      orders: item.orderCount,
    }));

    const coldProducts = sortedProducts
      .slice(-5)
      .reverse()
      .map((item) => ({
        name: item.product.name,
        name_he: item.product.name_he,
        name_en: item.product.name_en,
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
    if (!ensureAdmin(req, res)) return;

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

// ✅ Category stats (orders per category)
router.get("/category-stats", protect, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { period = "month" } = req.query;
    const now = new Date();
    let start;

    if (period === "week") {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (period === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const orders = await Order.find({
      createdAt: { $gte: start },
    }).populate("items.product", "category");

    const counts = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const cat = item.product?.category || "Unknown";
        const qty = item.isWeighted ? 1 : item.quantity || 0;
        counts[cat] = (counts[cat] || 0) + qty;
      });
    });

    const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));
    res.json({ categories });
  } catch (error) {
    console.error("❌ Error calculating category stats:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

// ✅ Coupons (admin)
router.get("/coupons", protect, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (error) {
    console.error("❌ Error fetching coupons:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

router.post("/coupons", protect, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { code, type, value, active = true } = req.body;

    const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
    const numericValue = Number(value);
    if (!normalizedCode) return res.status(400).json({ message: "חובה להזין קוד קופון" });
    if (!["percent", "fixed"].includes(type)) return res.status(400).json({ message: "סוג קופון לא תקין" });
    if (!Number.isFinite(numericValue) || numericValue <= 0) return res.status(400).json({ message: "ערך קופון לא תקין" });
    if (type === "percent" && numericValue > 100) return res.status(400).json({ message: "אחוז הנחה חייב להיות עד 100" });

    const coupon = await Coupon.create({
      code: normalizedCode,
      type,
      value: numericValue,
      active: Boolean(active),
    });

    res.status(201).json({ coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "קוד קופון כבר קיים" });
    }
    console.error("❌ Error creating coupon:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

router.delete("/coupons/:id", protect, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "קופון לא נמצא" });
    res.json({ message: "קופון הוסר" });
  } catch (error) {
    console.error("❌ Error deleting coupon:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

module.exports = router;
