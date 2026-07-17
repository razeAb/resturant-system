const { haversineKm } = require("./distance");
const { pointInGeoJson } = require("./geo");

// Fixed delivery pricing formula — not restaurant-configurable, applies automatically.
const BASE_FEE = 25;
const PER_KM_FEE = 2;

// Determines the delivery fee for a given address: eligibility is whether the address
// falls inside one of the configured delivery zones' real boundaries, and the fee itself
// is BASE_FEE + PER_KM_FEE * straight-line distance from the restaurant. Returns
// { outOfRange: true, distanceKm } when the address isn't inside any zone, otherwise
// { distanceKm, fee, zoneName }.
function computeDeliveryFee(restaurant, deliveryAddress) {
  const restaurantLat = restaurant?.address?.lat;
  const restaurantLng = restaurant?.address?.lng;
  if (!Number.isFinite(restaurantLat) || !Number.isFinite(restaurantLng)) {
    return { unconfigured: true };
  }

  const zones = restaurant?.deliveryZones || [];
  if (!zones.length) return { unconfigured: true };

  const distanceKm = haversineKm(restaurantLat, restaurantLng, deliveryAddress.lat, deliveryAddress.lng);

  const zone = zones.find((z) => pointInGeoJson(deliveryAddress.lat, deliveryAddress.lng, z.boundary));
  if (!zone) return { outOfRange: true, distanceKm };

  const fee = Math.round(BASE_FEE + PER_KM_FEE * distanceKm);

  return { distanceKm, fee, zoneName: zone.name };
}

module.exports = { computeDeliveryFee };
