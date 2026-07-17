const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const driverSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    online: { type: Boolean, default: false },
    expoPushTokens: [{ type: String }],
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

driverSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

driverSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Driver", driverSchema);
