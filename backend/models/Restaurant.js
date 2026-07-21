const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    address: {
      text: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // Explicit whitelist of settlements (cities/villages) the restaurant delivers to.
    // A delivery address is eligible if it falls inside one of these zones' real
    // boundaries (fetched from OSM when the admin adds the zone); anywhere not covered
    // by a zone is outside the delivery area. The fee itself is a fixed distance-based
    // formula (see backend/utils/deliveryPricing.js) — not restaurant-configurable.
    deliveryZones: [
      {
        name: { type: String, required: true },
        // Google Place ID, when the zone was added via Google Places search - a stable
        // identity that survives the same village being typed/spelled differently later.
        placeId: { type: String, default: null },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        boundary: { type: mongoose.Schema.Types.Mixed, required: true },
      },
    ],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
