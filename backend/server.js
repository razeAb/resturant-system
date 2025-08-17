const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Order = require("./models/Order");


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
module.exports.io = io;

// ✅ MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
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
app.use("/api/upload", require("./uploadRoute"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/tranzila", require("./routes/TranzillaRoutes"));
app.use("/api/config", require("./routes/config"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/shifts", require("./routes/shiftRoutes"));
// ✅ Tranzila Webhook Endpoint
app.post("/api/tranzila-webhook", async (req, res) => {
  try {
    // טרנזילה שולחים בדרך כלל application/x-www-form-urlencoded
    const data = req.body;
    console.log("📩 Webhook received:", data);

    // אימות טוקן (אם יש)
    const token = req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && token !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      console.warn("⚠️ Invalid token");
      return res.status(403).send("Forbidden");
    }

    // ✅ הצלחה יכולה להגיע תחת processor_response_code או Response
    const isSuccess = data.processor_response_code === "000" || data.Response === "000" || data.response === "000";

    if (!isSuccess) {
      console.warn("❌ Payment failed payload:", data);
      return res.status(200).send("received"); // להימנע מריצוד/רטראי
    }

    // ✅ שלוף את מזהה ההזמנה שלך שחזר מהחיוב (מאוד חשוב ששלחת אותו כ-ud1)
    const clientOrderId = data.ud1 || data.orderId || data.clientOrderId || req.query.orderId;
    if (!clientOrderId) {
      console.error("✅ Success but missing clientOrderId (ud1). Payload:", data);
      return res.status(200).send("received");
    }

    // ✅ מצא את ההזמנה שנוצרה לפני התשלום
    const order = await Order.findOne({ clientOrderId });
    if (!order) {
      console.error("❌ Order not found for clientOrderId:", clientOrderId);
      return res.status(200).send("received");
    }

    // ✅ עדכן סטטוס ופרטי תשלום מה־payload של טרנזילה
    order.status = "paid"; // או "preparing" אם ככה אתה מציג ב-Active
    order.paymentDetails = {
      provider: "tranzila",
      transaction_id: data.transaction_id,
      auth_number: data.auth_number,
      card_type: data.card_type_name || data.card_type,
      last4: data.last_4,
      token: data.token,
      amount: Number(data.sum || data.amount || order.totalPrice || 0),
      currency: data.currency || data.currency_code || "1", // 1=ILS אצלם
      raw: data, // לשמור הכל לבקרה
    };

    await order.save();
    console.log("✅ Order updated as paid:", order._id);

    // 🔔 notify admin dashboard in real-time
    if (io && io.emit) {
      io.emit("order_paid", {
        _id: order._id,
        clientOrderId: order.clientOrderId,
        items: order.items,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt,
      });
    }
    return res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    // מחזירים 200 כדי לא לגרום לריטריים אינסופיים
    return res.status(200).send("received");
  }
});

// ✅ Server Ready
app.get("/", (req, res) => res.send("🚀 Server Running"));
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
