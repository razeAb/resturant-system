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

// Web Mercator (EPSG:3857) meters -> WGS84 lat/lng, the projection GovMap's search
// service returns coordinates in.
function mercatorToWgs84(x, y) {
  const R = 6378137;
  const lng = ((x / R) * 180) / Math.PI;
  const lat = ((2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180) / Math.PI;
  return { lat, lng };
}

// Free-text lookup via Google's Places API (Text Search), used first when
// GOOGLE_PLACES_API_KEY is set. Unlike GovMap/Nominatim (pure address geocoders), this
// also resolves business/POI names (e.g. a restaurant's own name), which is the one
// thing the free options can't do at all.
async function googlePlacesSearch(text) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const res = await axios.post(
    "https://places.googleapis.com/v1/places:searchText",
    { textQuery: text },
    {
      timeout: 8000,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.location,places.formattedAddress,places.displayName",
      },
    }
  );
  const first = res.data?.places?.[0];
  if (!first?.location) return null;

  return { lat: first.location.latitude, lng: first.location.longitude, text: first.formattedAddress || first.displayName?.text };
}

// Free-text address lookup via GovMap (the Israeli government's official mapping
// portal, govmap.gov.il) search service. Unlike OSM/Nominatim, its address index goes
// down to house-number level even for small villages, so it's used as a fallback when
// no Google API key is configured (or Google's lookup fails). This is the same public,
// unauthenticated endpoint the govmap.gov.il website itself calls for its search box
// (not the token-gated embeddable map JS API) — no key or billing required, but since
// it's undocumented it could change without notice, which is why geocodeAddressText()
// below falls back further to Nominatim if it fails.
async function govmapSearch(text) {
  const res = await axios.post(
    "https://www.govmap.gov.il/api/search-service/autocomplete",
    { searchText: text, language: "he", isAccurate: false, maxResults: 5 },
    {
      timeout: 8000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; HungrySmokedMeatBot/1.0)",
        Referer: "https://www.govmap.gov.il/",
      },
    }
  );
  const first = res.data?.results?.[0];
  if (!first) return null;

  const match = /POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/.exec(first.shape || "");
  if (!match) return null;

  const { lat, lng } = mercatorToWgs84(Number(match[1]), Number(match[2]));
  return { lat, lng, text: first.originalText || first.text };
}

// Free-text address lookup via OpenStreetMap's Nominatim (no API key/billing). Used as
// a fallback if GovMap's search doesn't resolve anything. Biased to Israel/Hebrew, with
// an unrestricted retry in case the biased query comes up empty.
//
// OSM also has no street-level data for a lot of small Israeli villages (house
// numbers/street names simply aren't mapped), so a full "business, street, village, zip"
// string often matches nothing even though the village itself is indexed. To handle
// that, if the full text doesn't resolve, progressively drop the leading comma-separated
// segment (usually the business name, then the unmapped street) and retry, so we still
// land on at least the village center.
async function nominatimSearch(text) {
  const headers = { "User-Agent": "HungrySmokedMeat-RestaurantSettings/1.0 (contact: owner)" };

  const search = async (query, params) => {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: query, format: "json", limit: 1, ...params },
      timeout: 8000,
      headers,
    });
    return res.data?.[0] || null;
  };

  const segments = text.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const query = segments.slice(i).join(", ");
    const first = (await search(query, { countrycodes: "il", "accept-language": "he" })) || (await search(query, {}));
    if (first) return { lat: Number(first.lat), lng: Number(first.lon), text: first.display_name };
  }
  return null;
}

async function geocodeAddressText(text) {
  try {
    const googleResult = await googlePlacesSearch(text);
    if (googleResult) return googleResult;
  } catch (err) {
    console.error("Google Places geocoding failed, falling back to GovMap/Nominatim", err.message);
  }

  try {
    const govmapResult = await govmapSearch(text);
    if (govmapResult) return govmapResult;
  } catch (err) {
    console.error("GovMap geocoding failed, falling back to Nominatim", err.message);
  }
  return nominatimSearch(text);
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

// Looks up the actual shape (polygon/multipolygon) of the settlement a point falls
// in — e.g. Yarka's real village boundary, not just a circle — via OSM/Nominatim reverse
// geocoding. Google's Geocoding/Places APIs only expose a rectangular viewport for
// localities, not the real boundary, so there's no Google equivalent for this; Nominatim
// is the only free source that has it (zoom=10 targets city/town/village level).
async function getSettlementBoundary(lat, lng) {
  const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
    params: { lat, lon: lng, format: "json", zoom: 10, polygon_geojson: 1, "accept-language": "he" },
    timeout: 8000,
    headers: { "User-Agent": "HungrySmokedMeat-RestaurantSettings/1.0 (contact: owner)" },
  });
  const data = res.data;
  if (!data?.geojson || (data.geojson.type !== "Polygon" && data.geojson.type !== "MultiPolygon")) return null;

  return { name: data.name || data.display_name, geojson: data.geojson };
}

function detectScript(text) {
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[֐-׿]/.test(text)) return "he";
  return "en";
}

// GovMap's settlement search — same free public endpoint as govmapSearch, filtered to
// settlement-type results. Only accepts language "he" or "en" (no "ar"), and only
// returns matches when the query's script matches that language, so it's skipped
// entirely for Arabic input.
async function searchSettlementsGovmap(query, language) {
  const res = await axios.post(
    "https://www.govmap.gov.il/api/search-service/autocomplete",
    { searchText: query, language, filterType: "settlement", isAccurate: false, maxResults: 8 },
    {
      timeout: 8000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; HungrySmokedMeatBot/1.0)",
        Referer: "https://www.govmap.gov.il/",
      },
    }
  );

  const results = res.data?.results || [];
  return results
    .map((r) => {
      const match = /POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/.exec(r.shape || "");
      if (!match) return null;
      const { lat, lng } = mercatorToWgs84(Number(match[1]), Number(match[2]));
      return { name: r.text, lat, lng };
    })
    .filter(Boolean);
}

// Settlement search via OSM/Nominatim — unlike GovMap, it matches a place regardless of
// which script (Hebrew/Arabic/English) the query or the place's OSM name tags are in, so
// it's the fallback for Arabic queries and for English names GovMap doesn't index (it
// only reliably has English names for major cities, not every village).
async function searchSettlementsNominatim(query) {
  const res = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: query, format: "json", limit: 8, countrycodes: "il", featureType: "settlement", "accept-language": "he" },
    timeout: 8000,
    headers: { "User-Agent": "HungrySmokedMeat-RestaurantSettings/1.0 (contact: owner)" },
  });

  const seen = new Set();
  const results = [];
  for (const r of res.data || []) {
    const name = r.name || r.display_name?.split(",")[0];
    if (!name || seen.has(name)) continue; // OSM often has both a boundary relation and a place node for the same settlement
    seen.add(name);
    results.push({ name, lat: Number(r.lat), lng: Number(r.lon) });
  }
  return results;
}

// Settlement search via Google Places Text Search, used first when GOOGLE_PLACES_API_KEY
// is set - generally the best-quality/most-forgiving matcher of the three (handles typos,
// transliteration, and mixed scripts better than GovMap/Nominatim), and the only one that
// gives a stable Place ID, so a zone stays correctly identified even if the admin later
// re-adds a village typed slightly differently.
async function searchSettlementsGoogle(query) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const res = await axios.post(
    "https://places.googleapis.com/v1/places:searchText",
    { textQuery: query, languageCode: "he", regionCode: "IL" },
    {
      timeout: 8000,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.location,places.displayName,places.formattedAddress",
      },
    }
  );

  const places = res.data?.places || [];
  return places
    .map((p) => ({
      name: p.displayName?.text || p.formattedAddress,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      placeId: p.id,
    }))
    .filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

// Autocomplete search for city/village names (for the admin's "add a delivery area"
// picker), supporting Hebrew, English, and Arabic input.
async function searchSettlements(query) {
  try {
    const googleResults = await searchSettlementsGoogle(query);
    if (googleResults?.length) return googleResults;
  } catch (err) {
    console.error("Google Places settlement search failed, falling back to GovMap/Nominatim", err.message);
  }

  const script = detectScript(query);

  if (script !== "ar") {
    try {
      const govmapResults = await searchSettlementsGovmap(query, script);
      if (govmapResults.length) return govmapResults;
    } catch (err) {
      console.error("GovMap settlement search failed, falling back to Nominatim", err.message);
    }
  }

  try {
    return await searchSettlementsNominatim(query);
  } catch (err) {
    console.error("Nominatim settlement search failed", err.message);
    return [];
  }
}

module.exports = { resolveLocation, getSettlementBoundary, searchSettlements };
