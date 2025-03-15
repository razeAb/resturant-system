const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Middleware
app.use(express.json());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected..."))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes")); // Authentication Routes
app.use("/api/users", require("./routes/userRoutes")); // User Routes
app.use("/api/products", require("./routes/productRoutes")); // Product Routes

// ✅ Basic Health Check
app.get("/", (req, res) => {
  res.send("🚀 Server is running...");
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
