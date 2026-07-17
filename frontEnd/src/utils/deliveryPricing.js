const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Straight-line ("as the crow flies") distance between two lat/lng points, in km.
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// Mirrors backend/utils/deliveryPricing.js so the checkout estimate (and the amount
// actually charged via Tranzila) matches what the backend will independently compute.
export function computeDeliveryFee(restaurant, deliveryAddress) {
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
  if (!Number.isFinite(deliveryAddress?.lat) || !Number.isFinite(deliveryAddress?.lng)) {
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
