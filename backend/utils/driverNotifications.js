const Order = require("../models/Order");
const Driver = require("../models/Driver");
const Restaurant = require("../models/Restaurant");
const { sendExpoPushNotifications } = require("./expoPush");
const { getDrivingDistance } = require("./googleDistance");

function getIo() {
  // server.js sets module.exports.io before requiring route files, so this
  // circular require resolves to the already-populated export at call time.
  try {
    return require("../server").io;
  } catch {
    return null;
  }
}

// Atomically flips delivery.status "none" -> "broadcasting" so a kitchen ETA
// update can never trigger two overlapping broadcasts for the same order.
async function broadcastDeliveryToDrivers(orderId) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, deliveryOption: "Delivery", "delivery.status": "none" },
    { $set: { "delivery.status": "broadcasting", "delivery.broadcastAt": new Date() }, $inc: { "delivery.broadcastAttempts": 1 } },
    { new: true }
  );
  if (!claimed) return { skipped: true, reason: "already_broadcast_or_not_delivery" };

  // Real driving distance/ETA (vs. the straight-line deliveryDistanceKm used for pricing),
  // computed once here and cached on the order so drivers polling every few seconds don't
  // each trigger their own Google API call.
  const restaurant = await Restaurant.findById(claimed.restaurant).select("address").lean();
  const driving = await getDrivingDistance(restaurant?.address, claimed.deliveryAddress);
  if (driving) {
    await Order.updateOne(
      { _id: orderId },
      { $set: { deliveryDrivingDistanceKm: driving.distanceKm, deliveryDrivingDurationMin: driving.durationMin } }
    );
  }

  // Only drivers who cover BOTH the restaurant's location and the customer's zone should
  // be alerted - a driver near the customer but far from this particular restaurant's
  // pickup area shouldn't be pinged. Drivers pick their own work areas independently, so
  // match by Google Place ID rather than by zone name.
  const matchingDrivers = await Driver.find({
    online: true,
    restaurant: claimed.restaurant,
    $and: [
      { zones: { $elemMatch: { placeId: claimed.deliveryZonePlaceId, active: true } } },
      { zones: { $elemMatch: { placeId: claimed.restaurantZonePlaceId, active: true } } },
    ],
  }).lean();

  // Only the restaurant's own online drivers should ever see this - not every connected
  // socket (a customer's open browser tab, etc.).
  getIo()?.to(`drivers:${claimed.restaurant}`)?.emit?.("delivery:new", {
    orderId: String(orderId),
    totalPrice: claimed.totalPrice,
    address: claimed.deliveryAddress,
    estimatedTime: claimed.estimatedTime,
  });

  const tokens = matchingDrivers.flatMap((d) => d.expoPushTokens || []);
  sendExpoPushNotifications(tokens, {
    title: "משלוח חדש זמין",
    body: [claimed.deliveryZoneName, claimed.deliveryFee ? `₪${claimed.deliveryFee}` : null].filter(Boolean).join(" · "),
    data: { type: "delivery:new", orderId: String(orderId) },
  }).catch((err) => console.error("❌ Driver push notify failed:", err?.message || err));

  return { driversNotified: matchingDrivers.length, driverIds: matchingDrivers.map((d) => d._id) };
}

// Atomically assigns the order to the first driver who claims it; a second
// driver's claim attempt on the same order will find no matching document.
async function claimOrderForDriver(orderId, driverId) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, "delivery.driver": null, "delivery.status": { $in: ["broadcasting", "none"] } },
    { $set: { "delivery.driver": driverId, "delivery.status": "claimed", "delivery.claimedAt": new Date() } },
    { new: true }
  );
  if (!claimed) return null;

  await Driver.updateOne({ _id: driverId }, { $set: { currentOrder: claimed._id } });
  getIo()?.to(`drivers:${claimed.restaurant}`)?.emit?.("delivery:claimed", { orderId: String(orderId), driverId: String(driverId) });
  return claimed;
}

module.exports = { broadcastDeliveryToDrivers, claimOrderForDriver, getIo };
