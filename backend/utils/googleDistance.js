const axios = require("axios");

// Real driving distance/duration between two points via Google's Distance Matrix API.
// Returns null on any failure (missing key, no route, network error) so a broadcast is
// never blocked by this - callers should fall back to the haversine estimate.
async function getDrivingDistance(origin, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !origin || !destination) return null;
  if (![origin.lat, origin.lng, destination.lat, destination.lng].every(Number.isFinite)) return null;

  try {
    const res = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        mode: "driving",
        key: apiKey,
      },
      timeout: 8000,
    });
    const element = res.data?.rows?.[0]?.elements?.[0];
    if (res.data?.status !== "OK" || element?.status !== "OK") return null;

    return {
      distanceKm: element.distance.value / 1000,
      durationMin: Math.round(element.duration.value / 60),
    };
  } catch (err) {
    console.error("❌ Google Distance Matrix request failed:", err?.message || err);
    return null;
  }
}

module.exports = { getDrivingDistance };
