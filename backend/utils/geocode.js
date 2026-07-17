const axios = require("axios");

const COORD_PATTERNS = [
  /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // .../place/Name/@32.9563,35.2113,17z
  /[?&](?:q|query|ll|daddr)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // ?q=32.9563,35.2113
];

function extractCoordsFromUrl(url) {
  for (const pattern of COORD_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

const isUrl = (input) => /^https?:\/\//i.test(input.trim());

// Follows a (possibly shortened, e.g. maps.app.goo.gl) Google Maps link to its final
// URL and pulls the @lat,lng out of it, without needing a paid Google Maps API key.
async function resolveGoogleMapsUrl(url) {
  const direct = extractCoordsFromUrl(url);
  if (direct) return direct;

  const res = await axios.get(url, {
    maxRedirects: 5,
    timeout: 8000,
    validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; HungrySmokedMeatBot/1.0)" },
  });
  const finalUrl = res.request?.res?.responseUrl || res.request?.responseURL || url;
  return extractCoordsFromUrl(finalUrl);
}

// Free-text address lookup via OpenStreetMap's Nominatim (no API key/billing).
async function geocodeAddressText(text) {
  const res = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: text, format: "json", limit: 1 },
    timeout: 8000,
    headers: { "User-Agent": "HungrySmokedMeat-RestaurantSettings/1.0 (contact: owner)" },
  });
  const first = res.data?.[0];
  if (!first) return null;
  return { lat: Number(first.lat), lng: Number(first.lon), text: first.display_name };
}

// Resolves either a Google Maps link (full or shortened) or a plain-text address
// into { lat, lng, text }. Returns null if nothing could be resolved.
async function resolveLocation(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;

  if (isUrl(trimmed)) {
    const coords = await resolveGoogleMapsUrl(trimmed);
    if (coords) return { ...coords, text: trimmed };
    // Fall through to text geocoding as a last resort (e.g. link with a place name only)
  }

  return geocodeAddressText(trimmed);
}

module.exports = { resolveLocation };
