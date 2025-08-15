const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  title: { type: String },
  category: {
    type: String,
    enum: ["rent", "utilities", "marketing", "salary", "software", "other"],
    required: true,
  },
  amount: { type: Number, required: true },
  frequency: { type: String, enum: ["monthly", "weekly", "one_time"], default: "monthly" },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  active: { type: Boolean, default: true },
});

module.exports = mongoose.model("Expense", expenseSchema);