const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  name_he: { type: String },
  name_en: { type: String },
  price: { type: Number, required: true },
    cogsPerUnit: { type: Number, default: 0 },
  stock: { type: Number, required: true },
  description: { type: String },
  description_he: { type: String },
  description_en: { type: String },
  image: { type: String },
  category: { type: String, required: true }, // ✅ Added required category
  fullSandwichPrice: { type: Number, default: 0 },
  extraPattyPrice: { type: Number, default: 0 },
  portionOptions: [
    {
      label_he: { type: String, default: "" },
      label_en: { type: String, default: "" },
      price: { type: Number, default: 0 },
    },
  ],
  isActive:{
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);
