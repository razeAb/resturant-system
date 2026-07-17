const { haversineKm } = require("./distance");

// Determines the delivery fee tier for a given delivery address relative to the
// restaurant's location. Returns { outOfRange: true, distanceKm } when the address
// is beyond the configured delivery area, otherwise { distanceKm, fee, tier }.
function computeDeliveryFee(restaurant, deliveryAddress) {
  const pricing = restaurant?.deliveryPricing || {};
  const sameCityRadiusKm = Number(pricing.sameCityRadiusKm) || 4;
  const sameCityFee = Number(pricing.sameCityFee) || 25;
  const nearbyRadiusKm = Number(pricing.nearbyRadiusKm) || 12;
  const nearbyFee = Number(pricing.nearbyFee) || 35;

  const restaurantLat = restaurant?.address?.lat;
  const restaurantLng = restaurant?.address?.lng;
  if (!Number.isFinite(restaurantLat) || !Number.isFinite(restaurantLng)) {
    return { unconfigured: true };
  }

  const distanceKm = haversineKm(restaurantLat, restaurantLng, deliveryAddress.lat, deliveryAddress.lng);

  if (distanceKm <= sameCityRadiusKm) {
    return { distanceKm, fee: sameCityFee, tier: "same_city" };
  }
  if (distanceKm <= nearbyRadiusKm) {
    return { distanceKm, fee: nearbyFee, tier: "nearby" };
  }
  return { outOfRange: true, distanceKm };
}

module.exports = { computeDeliveryFee };
