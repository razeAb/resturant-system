const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// 📦 Load environment variables
dotenv.config();

// ✅ Initialize app FIRST before using it
const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Import routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const uploadRoute = require("./uploadRoute");
const paymentRoutes = require("./routes/paymentRoutes");
// ✅ CORS setup
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

// webHook
app.use(express.urlencoded({ extended: true }));

// ✅ JSON middleware
app.use(express.json());

// ✅ Serve uploaded files from local folder (for backward compatibility)

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Register routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/upload", uploadRoute);
app.use("/api/payments", paymentRoutes);
app.use("/api", require("./routes/tranzila")); // ✅ Add this line

// ✅ Tranzila Webhook Route
app.post("/api/tranzila-webhook", (req, res) => {
  const data = req.body;

  console.log("📩 Webhook from Tranzila:", data);

  if (data.Response === "000") {
    console.log("✅ Payment successful for token:", data.token);
    // TODO: Save payment, confirm order, etc.
  } else {
    console.log("❌ Payment failed. Code:", data.Response);
  }

  res.send("OK");
});

// ✅ Health Check
app.get("/", (req, res) => {
  res.send("🚀 Server is running...");
});

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected..."))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
