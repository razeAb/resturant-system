const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  clientOrderId: {
    type: String,
    index: true,
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      title: String,
      price: Number,
      img: String,
      quantity: Number,
      isWeighted: Boolean,
      vegetables: [String],
      sauces: [String],
      additions: [
        {
          addition: String,
          price: Number,
        },
      ],
      doneness: String,
      comment: String,
    },
  ],
  phone: {
    type: String,
  },
  customerName: {
    type: String,
  },
  comment: {
    type: String,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  deliveryOption: {
    type: String,
    required: true,
    enum: ["Pickup", "Delivery", "EatIn"],
  },
  paymentDetails: {
    method: { type: String },
    provider: { type: String },
    transaction_id: { type: String },
    auth_number: { type: String },
    card_type: { type: String },
    last4: { type: String },
    token: { type: String },
    amount: { type: Number },
    currency: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  tranzilaToken: { type: String },
  tranzilaResponse: { type: mongoose.Schema.Types.Mixed },
  paidAt: { type: Date },
  // Track which coupon was used for this order, if any
  couponUsed: {
    type: String,
    enum: ["drink", "side"],
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    // Unified set of order statuses used across the app
    enum: ["pending_payment", "paid", "preparing", "delivering", "done", "canceled"],
    default: "pending_payment",
  },
  estimatedTime: {
    type: Number,
    default: null,
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    default: null,
  },
  deliveryAddress: {
    text: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    notes: { type: String, default: "" },
  },
  deliveryFee: { type: Number, default: 0 },
  deliveryDistanceKm: { type: Number, default: null },
  deliveryZoneName: { type: String, default: null },
  // Google Place ID of the resolved zone - used to match drivers by placeId instead of
  // by name, since a driver's own zone list is independent of the restaurant's zone names.
  deliveryZonePlaceId: { type: String, default: null },
  // Place ID of the zone containing the restaurant itself (for this order's restaurant) -
  // a driver must cover both this and deliveryZonePlaceId to be offered the delivery, so
  // they're never sent on a pickup far from their own working area.
  restaurantZonePlaceId: { type: String, default: null },
  // True when the order's zone had no online driver covering it at checkout, so the fee
  // was left at ₪0 pending a manual phone call to the customer to confirm the real fee.
  feeUndetermined: { type: Boolean, default: false },
  delivery: {
    status: {
      type: String,
      enum: [
        "none",
        "broadcasting",
        "claimed",
        "arrived_at_restaurant",
        "picked_up",
        "delivered",
        "customer_unavailable",
        "returned_to_restaurant",
        "canceled",
      ],
      default: "none",
    },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    broadcastAt: { type: Date, default: null },
    broadcastAttempts: { type: Number, default: 0 },
    etaAnchoredAt: { type: Date, default: null },
    // Drivers who declined this broadcast - excluded from their own future available-orders polls.
    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Driver" }],
    claimedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cashCollected: { type: Boolean, default: false },
    cashCollectedAt: { type: Date, default: null },
    // Snapshot of what the driver earns for this delivery, and who still owes it -
    // cash orders are self-collected on the spot; card orders are owed by the restaurant.
    driverEarning: { type: Number, default: null },
    driverPayoutStatus: { type: String, enum: ["self_collected", "owed", "paid"], default: null },
    driverNote: { type: String, default: "" },
  },
  ownerSms: {
    notifiedAt: { type: Date, default: null },
    messageSid: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    sending: { type: Boolean, default: false },
    sendingAt: { type: Date, default: null },
  },
  customerSms: {
    etaNotifiedAt: { type: Date, default: null },
    etaMinutes: { type: Number, default: null },
    etaAttempts: { type: Number, default: 0 },
    etaLastAttemptAt: { type: Date, default: null },
    etaLastError: { type: String, default: "" },
    etaSending: { type: Boolean, default: false },
    etaSendingAt: { type: Date, default: null },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("Order", OrderSchema);
