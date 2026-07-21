// Read-only Leaflet map (WebView) showing the restaurant + customer pins for a single
// delivery, for the admin's "view on a map" action. No live driver position - that's a
// separate, deferred feature (would need actual GPS reporting from the driver app).
export function buildDeliveryMapHtml({ restaurantLat, restaurantLng, customerLat, customerLng }) {
  const points = [];
  const markers = [];

  if (Number.isFinite(restaurantLat) && Number.isFinite(restaurantLng)) {
    points.push([restaurantLat, restaurantLng]);
    markers.push(`L.marker([${restaurantLat}, ${restaurantLng}]).addTo(map).bindPopup("Restaurant");`);
  }
  if (Number.isFinite(customerLat) && Number.isFinite(customerLng)) {
    points.push([customerLat, customerLng]);
    markers.push(`L.marker([${customerLat}, ${customerLng}]).addTo(map).bindPopup("Customer");`);
  }

  const fitJs = points.length
    ? `map.fitBounds(${JSON.stringify(points)}, { padding: [40, 40], maxZoom: 14 });`
    : `map.setView([31.5, 34.9], 7);`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map("map", { zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    ${markers.join("\n")}
    ${fitJs}
  </script>
</body>
</html>`;
}
