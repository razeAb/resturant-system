const { haversineKm } = require("./distance");
const { pointInGeoJson } = require("./geo");

// Fixed delivery pricing formula — not restaurant-configurable, applies automatically.
// Flat BASE_FEE up to FREE_RADIUS_KM; every km beyond that adds PER_KM_FEE.
const BASE_FEE = 25;
const FREE_RADIUS_KM = 10;
const PER_KM_FEE = 2;
// Card payments are charged VAT on the delivery fee; cash isn't.
const CARD_VAT_RATE = 0.18;

// Finds which of a restaurant's configured zones (if any) contains a given point - used
// both for the customer's delivery address and for the restaurant's own location, so a
// driver can be matched on covering both ends of the trip. Works per-restaurant, so this
// holds up once multiple restaurants (each with their own zone list) are supported.
function findZoneForPoint(restaurant, lat, lng) {
  const zones = restaurant?.deliveryZones || [];
  return zones.find((z) => pointInGeoJson(lat, lng, z.boundary)) || null;
}

// Determines the delivery fee for a given address: eligibility is whether the address
// falls inside one of the configured delivery zones' real boundaries. The fee itself is a
// flat BASE_FEE for the first FREE_RADIUS_KM of straight-line distance from the restaurant,
// plus PER_KM_FEE for each km beyond that - with CARD_VAT_RATE added on top when the
// customer is paying by card (cash payments aren't charged VAT on the delivery fee). The VAT
// is the restaurant's - it pays the driver `baseFee`, the pre-VAT amount, regardless of how
// the customer paid. Returns { outOfRange: true, distanceKm } when the address isn't inside
// any zone, otherwise { distanceKm, fee, baseFee, zoneName, zonePlaceId }.
function computeDeliveryFee(restaurant, deliveryAddress, isCard = false) {
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

  const extraKm = Math.max(0, distanceKm - FREE_RADIUS_KM);
  const baseFee = Math.round(BASE_FEE + PER_KM_FEE * extraKm);
  const fee = isCard ? Math.round(baseFee * (1 + CARD_VAT_RATE)) : baseFee;

  return { distanceKm, fee, baseFee, zoneName: zone.name, zonePlaceId: zone.placeId || null };
}

module.exports = { computeDeliveryFee, findZoneForPoint };
