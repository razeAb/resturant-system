const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { sendWhatsAppNotification } = require("../utils/whatsapp");

/* ---------------- helpers / constants ---------------- */
const ALLOWED_DELIVERY = new Set(["Pickup", "Delivery", "EatIn"]);
const ALLOWED_METHODS = new Set(["Card", "Cash", "Bit"]);
const ALLOWED_STATUSES = new Set(["pending_payment", "preparing", "delivering", "done", "paid", "failed", "canceled"]);

const isObjectIdStr = (s) => typeof s === "string" && /^[a-f\d]{24}$/i.test(s);

function cleanItems(items) {
  const invalid = [];
  const cleaned = (Array.isArray(items) ? items : [])
    .map((it, idx) => {
      const product = it.product;
      const qty = Number(it.quantity);
      const okId = isObjectIdStr(product);
      const okQty = Number.isFinite(qty) && qty > 0;
      if (!okId || !okQty) {
        invalid.push({ index: idx, product, quantity: it.quantity });
        return null;
      }
      return {
        product,
        title: it.title,
        price: Number(it.price) || 0,
        img: it.img,
        quantity: qty,
        isWeighted: !!it.isWeighted,
        vegetables: Array.isArray(it.vegetables) ? it.vegetables : it.selectedOptions?.vegetables || [],
        additions: Array.isArray(it.additions) ? it.additions : it.selectedOptions?.additions || [],
        comment: it.comment || "",
      };
    })
    .filter(Boolean);

  return { cleaned, invalid };
}

function normalizeStatus({ method, rawStatus }) {
  if (method === "Cash") return "preparing"; // cash goes straight to kitchen
  if (rawStatus === "pending") return "pending_payment"; // legacy → new enum
  if (rawStatus && ALLOWED_STATUSES.has(rawStatus)) return rawStatus;
  return "pending_payment"; // default for card/unknown
}

/* ---------------- routes ---------------- */

// ✅ Create pre-payment order and return stable ID used as ud1
router.post("/create-pre-payment", async (req, res) => {
  try {
    const { items, totalPrice, deliveryOption, user, phone, customerName, paymentDetails, couponUsed } = req.body;

    // minimal checks so we don't store trash documents
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must include at least one item" });
    }
    if (!deliveryOption || !ALLOWED_DELIVERY.has(deliveryOption)) {
      return res.status(400).json({ message: `Invalid deliveryOption. Allowed: ${[...ALLOWED_DELIVERY].join(", ")}` });
    }
    const priceNumber = Number(totalPrice);
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ message: `Invalid totalPrice "${totalPrice}"` });
    }

    const { cleaned, invalid } = cleanItems(items);
    if (cleaned.length === 0) {
      return res.status(400).json({ message: "No valid items after validation", invalidItems: invalid });
    }

    const order = new Order({
      user: user || undefined,
      phone: phone || undefined,
      customerName: customerName || undefined,
      paymentDetails: {
        ...(paymentDetails || {}),
        // ensure method exists for card flow even if React state was late
        method: paymentDetails?.method || "Card",
      },
      couponUsed: couponUsed || undefined,
      items: cleaned,
      totalPrice: priceNumber, // ✅ parsed (you had an undefined parsedPrice before)
      deliveryOption,
      status: "pending_payment",
      createdAt: new Date(),
    });

    order.clientOrderId = order._id.toString(); // stable ID you pass as ud1
    await order.save();

    return res.status(201).json({ orderId: order.clientOrderId });
  } catch (err) {
    console.error("❌ Error creating pre-payment order:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ✅ Create a New Order (VALIDATED)
router.post("/", async (req, res) => {
  try {
    const { user, items, totalPrice, deliveryOption, status, createdAt, phone, customerName, paymentDetails, couponUsed } = req.body;

    console.log("🟢 incoming /api/orders payload:", {
      totalPrice,
      deliveryOption,
      method: paymentDetails?.method,
      itemsCount: Array.isArray(items) ? items.length : 0,
    });

    // ---- validation ----
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must include at least one item." });
    }
    if (!deliveryOption || !ALLOWED_DELIVERY.has(deliveryOption)) {
      return res.status(400).json({
        message: `Invalid deliveryOption "${deliveryOption}". Allowed: ${[...ALLOWED_DELIVERY].join(", ")}.`,
      });
    }
    const priceNumber = Number(totalPrice);
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ message: `Invalid totalPrice "${totalPrice}".` });
    }

    const { cleaned, invalid } = cleanItems(items);
    if (cleaned.length === 0) {
      return res.status(400).json({ message: "No valid items after validation.", invalidItems: invalid });
    }

    // ---- normalize method & status ----
    const incomingMethod = paymentDetails?.method;
    const normalizedMethod = ALLOWED_METHODS.has(incomingMethod) ? incomingMethod : undefined;
    const normalizedStatus = normalizeStatus({ method: normalizedMethod, rawStatus: typeof status === "string" ? status : undefined });
    console.log("🟢 normalized:", { normalizedMethod, normalizedStatus });

    // ---- create ----
    const newOrder = new Order({
      user: user || undefined,
      phone: phone || undefined,
      customerName: customerName || undefined,
      paymentDetails: {
        ...(paymentDetails || {}),
        method: normalizedMethod, // prevent enum crash if schema restricts it
      },
      couponUsed: couponUsed || undefined,
      items: cleaned,
      totalPrice: priceNumber,
      deliveryOption,
      status: normalizedStatus, // ✅ use normalized value (fixes 'pending' enum error)
      createdAt: createdAt || new Date(),
    });

    await newOrder.save();
    console.log("✅ Order saved:", {
      id: newOrder._id,
      price: newOrder.totalPrice,
      method: newOrder.paymentDetails?.method,
      status: newOrder.status,
    });
    sendWhatsAppNotification(newOrder);
    // ---- loyalty updates ----
    if (user) {
      const foundUser = await User.findById(user);
      if (foundUser) {
        foundUser.orderCount += 1;
        if (couponUsed === "drink") foundUser.usedDrinkCoupon = true;
        if (couponUsed === "side") {
          foundUser.orderCount = 0;
          foundUser.usedDrinkCoupon = false;
        } else if (foundUser.orderCount >= 10) {
          foundUser.orderCount = 10; // cap at 10 to allow side coupon next time
        }
        await foundUser.save();
      }
    }

    return res.status(201).json({ message: "✅ Order created successfully.", order: newOrder });
  } catch (error) {
    console.error("❌ Error creating order:", error?.message);
    if (error?.errors) {
      Object.entries(error.errors).forEach(([path, err]) => console.error(`• ${path}: ${err.message}`));
    }
    return res.status(error?.name === "ValidationError" ? 400 : 500).json({
      message: error?.name === "ValidationError" ? "Validation error creating order" : "Server error creating order",
      error: error?.message,
      details: error?.errors ? Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message])) : undefined,
    });
  }
});

// ✅ Tranzila payment success callback (kept as-is)
router.post("/success", async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log("💳 Payment success received for orderId:", orderId);

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await Order.findOne({ $or: [{ _id: orderId }, { clientOrderId: orderId }] });
    if (!order) {
      console.warn("❌ Order not found for payment success:", orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "paid";
    order.paymentStatus = "paid";
    order.paidAt = new Date();
    await order.save();

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
    if (estimatedTime) updateFields.estimatedTime = estimatedTime;

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
    res.status(500).json({ message: err.message });
  }
});

// ✅ Add item to order
router.post("/:id/add-item", async (req, res) => {
  const { id } = req.params;
  const { item, addedPrice } = req.body;

  if (!item) return res.status(400).json({ message: "Item data is required" });

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.items.push(item);
    if (addedPrice) order.totalPrice = Number(order.totalPrice || 0) + Number(addedPrice);

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
    const activeOrders = await Order.find({
      status: { $nin: ["done", "pending_payment", "failed", "canceled"] },
    })
      .populate("user", "name phone")
      .populate("items.product", "name name_he name_en")
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
    if (!req.user.isAdmin) query.user = req.user._id;

    const orders = await Order.find(query).populate("user", "name phone").populate("items.product", "name name_he name_en").sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get order by phone (latest)
router.get("/phone/:phone", async (req, res) => {
  const { phone } = req.params;
  try {
    let order = await Order.findOne({ phone }).sort({ createdAt: -1 });
    if (!order) {
      const user = await User.findOne({ phone });
      if (user) order = await Order.findOne({ user: user._id }).sort({ createdAt: -1 });
    }
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("❌ Error fetching order by phone:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get order by MongoDB _id
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name phone").populate("items.product", "name name_he name_en");

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
    res.status(200).json({ message: "✅ All orders fetched successfully.", orders });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
