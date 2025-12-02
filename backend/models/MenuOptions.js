const mongoose = require("mongoose");

const weightedAdditionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    pricePer50: { type: Number, default: 0 },
    pricePer100: { type: Number, default: 0 },
  },
  { _id: false }
);

const fixedAdditionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const menuOptionsSchema = new mongoose.Schema(
  {
    vegetables: { type: [String], default: [] },
    weightedAdditions: { type: [weightedAdditionSchema], default: [] },
    fixedAdditions: { type: [fixedAdditionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MenuOptions", menuOptionsSchema);