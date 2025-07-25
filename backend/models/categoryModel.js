const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  isWeighted: {
    type: Boolean,
    default: false,
  },
  // Vegetables and additions are now stored per category
  vegetables: [String],
  additions: {
    fixed: [
      {
        name: String,
        price: Number,
      },
    ],
    grams: [
      {
        name: String,
        prices: {
          50: { type: Number, default: 0 },
          100: { type: Number, default: 0 },
        },
      },
    ],
  },
});

module.exports = mongoose.model("Category", categorySchema);
