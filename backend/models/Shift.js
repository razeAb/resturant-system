const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    start: { type: Date, required: true },
    end: { type: Date },
    hours: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 0 },
    adjustedByManager: { type: Boolean, default: false },
    adjustedAt: { type: Date },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shift", shiftSchema);
