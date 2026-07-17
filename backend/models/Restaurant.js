const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: {
      text: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    deliveryPricing: {
      sameCityRadiusKm: { type: Number, default: 4 },
      sameCityFee: { type: Number, default: 25 },
      nearbyRadiusKm: { type: Number, default: 12 },
      nearbyFee: { type: Number, default: 35 },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
