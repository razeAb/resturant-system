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
  totalPrice: {
    type: Number,
    required: true,
  },
  deliveryOption: {
    type: String,
    required: true,
    enum: ["Pickup", "Delivery", "EatIn"],
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "completed", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("Order", OrderSchema);
