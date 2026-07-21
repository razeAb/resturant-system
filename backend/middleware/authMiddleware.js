const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ✅ Middleware to verify JWT and attach user to `req.user`
const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ Check if token is in headers
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ If no token, deny access
    if (!token) {
      return res.status(401).json({ message: "❌ No token, authorization denied." });
    }

    try {
      // ✅ Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Fetch user from DB & attach to request (excluding password)
      req.user = await User.findById(decoded.userId).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "❌ User not found, authorization denied." });
      }

      next(); // Move to next middleware
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "❌ Token expired, please login again." });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "❌ Invalid token." });
      } else {
        return res.status(401).json({ message: "❌ Token verification failed." });
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error verifying token:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
};

// Shared gate for routes either the restaurant admin (isAdmin) or the delivery-platform
// admin (isPlatformAdmin, the driver app's "Admin Mode") may use - e.g. driver-account
// management, which isn't really restaurant-specific.
const ensureAnyAdmin = (req, res) => {
  if (!req.user?.isAdmin && !req.user?.isPlatformAdmin) {
    res.status(403).json({ message: "❌ Unauthorized access." });
    return false;
  }
  return true;
};

module.exports = { protect, ensureAnyAdmin };
