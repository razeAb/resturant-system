const { haversineKm } = require("./distance");
const { pointInGeoJson } = require("./geo");

// Fixed delivery pricing formula — not restaurant-configurable, applies automatically.
const BASE_FEE = 25;
const PER_KM_FEE = 2;

// Finds which of a restaurant's configured zones (if any) contains a given point - used
// both for the customer's delivery address and for the restaurant's own location, so a
// driver can be matched on covering both ends of the trip. Works per-restaurant, so this
// holds up once multiple restaurants (each with their own zone list) are supported.
function findZoneForPoint(restaurant, lat, lng) {
  const zones = restaurant?.deliveryZones || [];
  return zones.find((z) => pointInGeoJson(lat, lng, z.boundary)) || null;
}

// Determines the delivery fee for a given address: eligibility is whether the address
// falls inside one of the configured delivery zones' real boundaries, and the fee itself
// is BASE_FEE + PER_KM_FEE * straight-line distance from the restaurant. Returns
// { outOfRange: true, distanceKm } when the address isn't inside any zone, otherwise
// { distanceKm, fee, zoneName, zonePlaceId }.
function computeDeliveryFee(restaurant, deliveryAddress) {
  const restaurantLat = restaurant?.address?.lat;
  const restaurantLng = restaurant?.address?.lng;
  if (!Number.isFinite(restaurantLat) || !Number.isFinite(restaurantLng)) {
    return { unconfigured: true };
  }

  const zones = restaurant?.deliveryZones || [];
  if (!zones.length) return { unconfigured: true };

  const distanceKm = haversineKm(restaurantLat, restaurantLng, deliveryAddress.lat, deliveryAddress.lng);

  const zone = findZoneForPoint(restaurant, deliveryAddress.lat, deliveryAddress.lng);
  if (!zone) return { outOfRange: true, distanceKm };

  const fee = Math.round(BASE_FEE + PER_KM_FEE * distanceKm);

  return { distanceKm, fee, zoneName: zone.name, zonePlaceId: zone.placeId || null };
}

module.exports = { computeDeliveryFee, findZoneForPoint };
