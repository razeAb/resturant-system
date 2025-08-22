const mongoose = require("mongoose");

const TableSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: String,
  seats: Number,
  x: Number,
  y: Number,
  w: Number,
  h: Number,
  r: { type: Number, default: 0 },
  shape: { type: String, enum: ["rect", "circle"], default: "rect" },
  status: { type: String, enum: ["free", "occupied", "bill", "reserved"], default: "free" },
});

const FloorSchema = new mongoose.Schema({
  venueId: String,
  name: String,
  width: Number,
  height: Number,
  tables: [TableSchema],
});

module.exports = mongoose.model("Floor", FloorSchema);
