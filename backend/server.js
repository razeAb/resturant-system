const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const Order = require("./models/Order");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const allowedOrigins = ["http://localhost:5173", "http://localhost:5177", "https://hungryresturant.netlify.app"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/workers", require("./routes/workerRoutes"));
app.use("/api/upload", require("./uploadRoute"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/tranzila", require("./routes/TranzillaRoutes"));
app.use("/api/config", require("./routes/config"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
// ✅ Tranzila Webhook Endpoint
app.post("/api/tranzila-webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Webhook received:", data);

    const token = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && token !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("⚠️ Invalid token");
      return res.status(403).send("Forbidden");
    }

    if (data.Response === "000") {
      let orderData = data.order || data.orderData;

      if (typeof orderData === "string") {
        try {
          orderData = JSON.parse(orderData);
        } catch {
          console.error("❌ Could not parse order JSON");
          return res.send("Invalid order data");
        }
      }

      if (!orderData || !orderData.items) return res.send("No valid order");

      const { user, items, totalPrice, deliveryOption, status, createdAt, phone, customerName, paymentDetails, couponUsed } = orderData;

      const newOrder = new Order({
        user,
        phone,
        customerName,
        paymentDetails,
        couponUsed,
        items,
        totalPrice: parseFloat(totalPrice),
        deliveryOption,
        status: status || "pending",
        createdAt: createdAt || new Date(),
      });

      await newOrder.save();
      console.log("✅ Order saved from webhook:", newOrder._id);
    } else {
      console.log("❌ Payment failed:", data.Response);
    }

    res.send("OK");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Error");
  }
});

// ✅ Server Ready
app.get("/", (req, res) => res.send("🚀 Server Running"));
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
