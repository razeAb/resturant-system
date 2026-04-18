const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  clientOrderId: {
    type: String,
    index: true,
  },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      title: String,
      price: Number,
      img: String,
      quantity: Number,
      isWeighted: Boolean,
      vegetables: [String],
      sauces: [String],
      additions: [
        {
          addition: String,
          price: Number,
        },
      ],
      doneness: String,
      comment: String,
    },
  ],
  phone: {
    type: String,
  },
  customerName: {
    type: String,
  },
  comment: {
    type: String,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  deliveryOption: {
    type: String,
    required: true,
    enum: ["Pickup", "Delivery", "EatIn"],
  },
  paymentDetails: {
    method: { type: String },
    provider: { type: String },
    transaction_id: { type: String },
    auth_number: { type: String },
    card_type: { type: String },
    last4: { type: String },
    token: { type: String },
    amount: { type: Number },
    currency: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  tranzilaToken: { type: String },
  tranzilaResponse: { type: mongoose.Schema.Types.Mixed },
  paidAt: { type: Date },
  // Track which coupon was used for this order, if any
  couponUsed: {
    type: String,
    enum: ["drink", "side"],
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    // Unified set of order statuses used across the app
    enum: ["pending_payment", "paid", "preparing", "delivering", "done", "canceled"],
    default: "pending_payment",
  },
  estimatedTime: {
    type: Number,
    default: null,
  },
  ownerWhatsApp: {
    notifiedAt: { type: Date, default: null },
    messageSid: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    sending: { type: Boolean, default: false },
    sendingAt: { type: Date, default: null },
  },
  ownerSms: {
    notifiedAt: { type: Date, default: null },
    messageSid: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    sending: { type: Boolean, default: false },
    sendingAt: { type: Date, default: null },
  },
  customerWhatsApp: {
    etaNotifiedAt: { type: Date, default: null },
    etaMinutes: { type: Number, default: null },
    etaMessageSid: { type: String, default: "" },
    etaAttempts: { type: Number, default: 0 },
    etaLastAttemptAt: { type: Date, default: null },
    etaLastError: { type: String, default: "" },
    etaSending: { type: Boolean, default: false },
    etaSendingAt: { type: Date, default: null },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("Order", OrderSchema);
