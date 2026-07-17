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

// Mirrors backend/utils/geo.js's point-in-polygon test, so the checkout estimate matches
// what the backend will independently (and authoritatively) compute.
function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(lat, lng, rings) {
  if (!rings.length || !pointInRing(lat, lng, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lat, lng, rings[i])) return false;
  }
  return true;
}

function pointInGeoJson(lat, lng, geojson) {
  if (!geojson) return false;
  if (geojson.type === "Polygon") return pointInPolygonRings(lat, lng, geojson.coordinates);
  if (geojson.type === "MultiPolygon") return geojson.coordinates.some((poly) => pointInPolygonRings(lat, lng, poly));
  return false;
}

// Fixed delivery pricing formula — not restaurant-configurable, applies automatically.
// Mirrors backend/utils/deliveryPricing.js.
const BASE_FEE = 25;
const PER_KM_FEE = 2;

// Eligibility is whether the address falls inside one of the configured delivery zones'
// real boundaries; the fee itself is BASE_FEE + PER_KM_FEE * straight-line distance from
// the restaurant.
export function computeDeliveryFee(restaurant, deliveryAddress) {
  const restaurantLat = restaurant?.address?.lat;
  const restaurantLng = restaurant?.address?.lng;
  if (!Number.isFinite(restaurantLat) || !Number.isFinite(restaurantLng)) {
    return { unconfigured: true };
  }
  if (!Number.isFinite(deliveryAddress?.lat) || !Number.isFinite(deliveryAddress?.lng)) {
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
