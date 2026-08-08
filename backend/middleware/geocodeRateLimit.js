const rateLimit = require("express-rate-limit");

// Address geocoding is public (no login) so a customer's checkout typing can hit it - capped
// per IP so it can't be used to run up the Google Places bill for free.
const geocodeRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "❌ Too many address lookups. Please slow down and try again shortly." },
});

module.exports = { geocodeRateLimit };
