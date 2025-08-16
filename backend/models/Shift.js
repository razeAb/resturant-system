const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },    start: { type: Date, required: true },
    end: { type: Date },
    hours: { type: Number, default: 0 },
    adjustedByManager: { type: Boolean, default: false },
    adjustedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shift", shiftSchema);
