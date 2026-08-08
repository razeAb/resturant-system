const rateLimit = require("express-rate-limit");

// Shared across every password-based login route (admin/customer, driver, worker) - caps
// guesses per IP+body-identifier pair so a script can't brute-force a password by hammering
// the endpoint. Deliberately loose enough that a real user mistyping their password a few
// times never gets blocked.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "❌ Too many login attempts. Please try again in a few minutes." },
});

module.exports = { loginRateLimit };
