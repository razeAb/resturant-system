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
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "completed", "cancelled"],
    default: "pending",
  },
  estimatedReadyTime: {
    type: Date, // ⏱️ Admin sets this to control frontend countdown
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
