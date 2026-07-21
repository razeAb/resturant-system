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
    // The driver's own chosen work areas - picked independently via Google Places search,
    // not tied to the restaurant's configured pricing zones. An order is only shown to a
    // driver when its resolved zone placeId matches one of these (active) entries.
    zones: [
      {
        placeId: { type: String, required: true },
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        active: { type: Boolean, default: true },
        // Real village/town outline (from OSM via geocode.js), fetched once when the zone
        // is added - purely cosmetic for the driver's own map, matching still uses placeId.
        boundary: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
    vehicleType: { type: String, default: "" },
    vehiclePlate: { type: String, default: "" },
    // Admin-controlled account status - a suspended driver can still log in but shouldn't
    // be treated as available (kept separate from `online`, which the driver toggles themselves).
    active: { type: Boolean, default: true },
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
