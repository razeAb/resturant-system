// Read-only Leaflet map (rendered inside a WebView) showing the driver's chosen work
// zones - the real village/town outline when one was fetched (see settlement-boundary in
// driverRoutes.js), falling back to a plain pin otherwise. Selecting/removing/disabling a
// zone happens through the search UI in profile.js - this is just a visual confirmation.
export function buildZoneMapHtml(zones) {
  const points = (zones || []).filter((z) => Number.isFinite(z.lat) && Number.isFinite(z.lng));

  const layersJs = points
    .map((z) => {
      const color = z.active === false ? "#bbb" : "#f97316";
      const popup = JSON.stringify(z.name);
      if (z.boundary) {
        return `group.addLayer(L.geoJSON(${JSON.stringify(
          z.boundary
        )}, { style: { color: "${color}", weight: 2, fillColor: "${color}", fillOpacity: 0.25 } }).bindPopup(${popup}));`;
      }
      return `group.addLayer(L.circleMarker([${z.lat}, ${z.lng}], { radius: 8, color: "${color}", fillColor: "${color}", fillOpacity: 0.9, weight: 2 }).bindPopup(${popup}));`;
    })
    .join("\n");

  // No zones yet: default to a view roughly centered on Israel rather than a blank globe.
  const fitJs = points.length
    ? `if (group.getLayers().length) { map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 12 }); }`
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
    const group = L.featureGroup().addTo(map);
    ${layersJs}
    ${fitJs}
  </script>
</body>
</html>`;
}
