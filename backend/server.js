const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// 📦 Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected..."))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ CORS config
const allowedOrigins = ["http://localhost:5173", "http://localhost:5177", "https://hungryresturant.netlify.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
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
app.use("/api/upload", require("./uploadRoute"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/tranzila", require("./routes/TranzillaRoutes")); // ✅ Only one Tranzila route
app.use("/api/config", require("./routes/config"));

// ✅ Tranzila Webhook Handler
const Order = require("./models/Order");

app.post("/api/tranzila-webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Webhook from Tranzila:", data);

    // Optional: Basic token check (set TRANZILA_WEBHOOK_TOKEN in .env)
    const receivedToken = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && receivedToken !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("⚠️ Webhook rejected: invalid token");
      return res.status(403).send("Forbidden");
    }

    if (data.Response === "000") {
      console.log("✅ Payment successful for token:", data.token);

      let orderData = data.order || data.orderData;
      if (typeof orderData === "string") {
        try {
          orderData = JSON.parse(orderData);
        } catch (err) {
          console.error("❌ Failed to parse order data:", err.message);
          orderData = null;
        }
      }

      if (orderData && orderData.items && orderData.totalPrice && orderData.deliveryOption) {
        const { user, items, totalPrice, deliveryOption, status, createdAt, phone, customerName, paymentDetails, couponUsed } = orderData;

        try {
          const newOrder = new Order({
            user: user || undefined,
            phone: phone || undefined,
            customerName: customerName || undefined,
            paymentDetails: paymentDetails || {},
            couponUsed: couponUsed || undefined,
            items,
            totalPrice: parseFloat(totalPrice),
            deliveryOption,
            status: status || "pending",
            createdAt: createdAt || new Date(),
          });

          await newOrder.save();
          console.log("✅ Order saved from webhook:", newOrder._id);
        } catch (err) {
          console.error("❌ Error saving order from webhook:", err);
        }
      } else {
        console.log("⚠️ Webhook missing order details, no order created");
      }
    } else {
      console.log("❌ Payment failed. Code:", data.Response);
    }

    res.send("OK");
  } catch (error) {
    console.error("❌ Error processing Tranzila webhook:", error);
    res.status(500).send("Error");
  }
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 Server is running...");
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
