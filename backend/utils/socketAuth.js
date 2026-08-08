const jwt = require("jsonwebtoken");
const Driver = require("../models/Driver");
const User = require("../models/User");

// Without this, every socket - including a customer's open browser tab - received every
// delivery/order event globally (io.emit with no rooms). This joins each authenticated
// socket into the room(s) it's actually allowed to see; unauthenticated/invalid-token
// sockets just join nothing and stay connected with no privileged data.
async function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.driverId) {
      const driver = await Driver.findById(decoded.driverId).select("restaurant");
      if (driver?.restaurant) socket.join(`drivers:${driver.restaurant}`);
    } else if (decoded.userId) {
      const user = await User.findById(decoded.userId).select("isAdmin");
      // Flat "staff" room, not per-restaurant, since User has no restaurant field yet -
      // fine for now as this is a single-restaurant system.
      if (user?.isAdmin) socket.join("staff");
    }
  } catch {
    // Expired/invalid/forged token - treat like no token, don't hard-fail the connection.
  }

  next();
}

module.exports = { socketAuthMiddleware };
