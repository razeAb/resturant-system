// Standard ray-casting point-in-polygon test. GeoJSON rings are [lng, lat] pairs;
// rings[0] is the outer boundary, any further rings are holes.
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
    if (pointInRing(lat, lng, rings[i])) return false; // inside a hole
  }
  return true;
}

// Tests whether { lat, lng } falls inside a GeoJSON Polygon or MultiPolygon geometry.
function pointInGeoJson(lat, lng, geojson) {
  if (!geojson) return false;
  if (geojson.type === "Polygon") return pointInPolygonRings(lat, lng, geojson.coordinates);
  if (geojson.type === "MultiPolygon") return geojson.coordinates.some((poly) => pointInPolygonRings(lat, lng, poly));
  return false;
}

module.exports = { pointInGeoJson };
