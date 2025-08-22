const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  qty: Number,
  course: { type: String, enum: ["starter", "main", "dessert", "drink"] },
  notes: String,
  status: { type: String, enum: ["queued", "fired", "served"], default: "queued" },
});

const TableOrderSchema = new mongoose.Schema(
  {
    tableId: { type: String, required: true },
    items: [ItemSchema],
    status: { type: String, enum: ["open", "paid", "void"], default: "open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TableOrder", TableOrderSchema);
