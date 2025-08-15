const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
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
      additions: [
        {
          addition: String,
          price: Number,
        },
      ],
      comment: String,
    },
  ],
  phone: {
    type: String,
  },
  customerName: {
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
    cardLastFour: { type: String },
    cardholderName: { type: String },
  },
  // Track which coupon was used for this order, if any
  couponUsed: {
    type: String,
    enum: ["drink", "side"],
  },
  status: {
    type: String,
    // Unified set of order statuses used across the app
    enum: ["pending", "preparing", "delivering", "done", "paid", "failed"],
    default: "pending",
  },
  estimatedTime: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("Order", OrderSchema);
