const mongoose = require("mongoose");

const paymentFeeRuleSchema = new mongoose.Schema({
  paymentMethod: { type: String, required: true, unique: true },
  percent: { type: Number, default: 0 },
  fixed: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

module.exports = mongoose.model("PaymentFeeRule", paymentFeeRuleSchema);
