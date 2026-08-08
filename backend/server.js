const dns = require("dns");
// Windows sometimes hands Node an IPv6-only DNS server that its resolver
// can't reach for SRV lookups (ECONNREFUSED), even though the OS resolver
// works fine. Force known-reachable IPv4 DNS servers so mongodb+srv:// works.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Order = require("./models/Order");
const { notifyOwnerSmsForOrder } = require("./utils/notifications");
const { ensureDefaultRestaurant } = require("./utils/ensureDefaultRestaurant");
const { socketAuthMiddleware } = require("./utils/socketAuth");

(() => {
  const envFile = process.env.ENV_FILE || (process.env.NODE_ENV === "production" ? ".env.production" : ".env");
  const envPath = path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  else dotenv.config();
})();

// Required after dotenv.config() above, since it reads LOG_LEVEL from the env at
// construction time.
const { logger } = require("./utils/logger");
const pinoHttp = require("pino-http");

// Without these, one uncaught error anywhere crashes the process with no record beyond
// whatever Node prints to stderr by default - this logs it properly through the same
// structured logger before exiting, so the host's restart (Render) has something to show.
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException - process exiting");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandledRejection - process exiting");
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
io.use(socketAuthMiddleware);
module.exports.io = io;

mongoose.set("bufferCommands", false);

// ✅ Middleware
// crossOriginResourcePolicy disabled: product/upload images under /uploads are meant to be
// loaded cross-origin by the separately-hosted frontend, which helmet's default would block.
app.use(helmet({ crossOriginResourcePolicy: false }));
// A full request/response dump on every successful call is just noise day-to-day - only
// errors and rate-limit/4xx responses are actually worth seeing in the terminal.
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "silent";
    },
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5177",
  "https://hungryresturant.netlify.app",
  "https://hungrysmokedmeat.com",
  "https://www.hungrysmokedmeat.com",
];

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
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/admin-mode", require("./routes/adminModeRoutes"));
app.use("/api/restaurant", require("./routes/restaurantRoutes"));
app.use("/api/upload", require("./uploadRoute"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/menu-options", require("./routes/menuOptionsRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/tranzila", require("./routes/TranzillaRoutes"));
app.use("/api/config", require("./routes/config"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/shifts", require("./routes/shiftRoutes"));
// ✅ Tranzila Webhook Endpoint
app.post("/api/tranzila-webhook", async (req, res) => {
  try {
    // טרנזילה שולחים בדרך כלל application/x-www-form-urlencoded
    const data = req.body;
    logger.info({ data }, "📩 Webhook received");

    // אימות טוקן (אם יש)
    // Tranzila's notify callback can't send a custom header, but the notify URL
    // configured in their terminal panel can include a query string — so the
    // token travels as ?token=... instead of an x-tranzila-token header.
    const token = req.query.token || req.headers["x-tranzila-token"];
    if (process.env.TRANZILA_WEBHOOK_TOKEN && token !== process.env.TRANZILA_WEBHOOK_TOKEN) {
      logger.warn("⚠️ Invalid webhook token");
      return res.status(403).send("Forbidden");
    }

    // ✅ הצלחה יכולה להגיע תחת processor_response_code או Response
    const isSuccess = data.processor_response_code === "000" || data.Response === "000" || data.response === "000";

    if (!isSuccess) {
      logger.warn({ data }, "❌ Payment failed payload");
      return res.status(200).send("received"); // להימנע מריצוד/רטראי
    }

    // ✅ שלוף את מזהה ההזמנה שלך שחזר מהחיוב (מאוד חשוב ששלחת אותו כ-ud1)
    const clientOrderId = data.ud1 || data.orderId || data.clientOrderId || req.query.orderId;
    if (!clientOrderId) {
      logger.error({ data }, "Success but missing clientOrderId (ud1)");
      return res.status(200).send("received");
    }

    // ✅ מצא את ההזמנה שנוצרה לפני התשלום
    const order = await Order.findOne({ clientOrderId });
    if (!order) {
      logger.error({ clientOrderId }, "❌ Order not found for clientOrderId");
      return res.status(200).send("received");
    }

    // ✅ עדכן סטטוס ופרטי תשלום מה־payload של טרנזילה
    order.status = "paid"; // או "preparing" אם ככה אתה מציג ב-Active
    order.paymentDetails = {
      ...(order.paymentDetails || {}),
      method: data.payment_method || order.paymentDetails?.method,
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
    logger.info({ orderId: order._id }, "✅ Order updated as paid");
    notifyOwnerSmsForOrder(order._id).catch((err) => {
      logger.error({ err: err?.response?.data || err?.message || err }, "❌ Owner SMS alert failed");
    });

    // 🔔 notify admin dashboard in real-time - staff room only, not every connected socket
    if (io && io.emit) {
      io.to("staff").emit("order_paid", {
        _id: order._id,
        clientOrderId: order.clientOrderId,
        items: order.items,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt,
        deliveryOption: order.deliveryOption,
        customerName: order.customerName,
        phone: order.phone,
        paymentDetails: order.paymentDetails,
      });
    }
    return res.status(200).send("ok");
  } catch (err) {
    logger.error({ err }, "❌ Webhook error");
    // מחזירים 200 כדי לא לגרום לריטריים אינסופיים
    return res.status(200).send("received");
  }
});

// ✅ Server Ready
app.get("/", (req, res) => res.send("🚀 Server Running"));

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info("✅ MongoDB Connected");
    await ensureDefaultRestaurant();
    server.listen(PORT, () => logger.info(`🚀 Server on port ${PORT}`));
  } catch (err) {
    logger.fatal({ err }, "❌ MongoDB Error");
    process.exit(1);
  }
}

startServer();
