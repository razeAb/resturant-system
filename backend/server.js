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
const uploadRoute = require("./routes/upload");

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

// ✅ JSON middleware
app.use(express.json());

// ✅ Serve uploaded files from local folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Register routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
const uploadRoute = require("./uploadRoute");
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
