const Order = require("../models/Order");
const Driver = require("../models/Driver");

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

  const onlineDrivers = await Driver.find({
    online: true,
    restaurant: claimed.restaurant,
  }).lean();

  getIo()?.emit?.("delivery:new", {
    orderId: String(orderId),
    totalPrice: claimed.totalPrice,
    address: claimed.deliveryAddress,
    estimatedTime: claimed.estimatedTime,
  });

  return { driversNotified: onlineDrivers.length, driverIds: onlineDrivers.map((d) => d._id) };
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
  getIo()?.emit?.("delivery:claimed", { orderId: String(orderId), driverId: String(driverId) });
  return claimed;
}

module.exports = { broadcastDeliveryToDrivers, claimOrderForDriver };
