const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
    cogsPerUnit: { type: Number, default: 0 },
  stock: { type: Number, required: true },
  description: { type: String },
  image: { type: String },
  category: { type: String, required: true }, // ✅ Added required category
  isActive:{
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);
