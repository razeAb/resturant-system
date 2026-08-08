// Shared with backend/routes/couponRoutes.js (customer-facing "validate this code" check) and
// backend/utils/orderPricingGuard.js (server-side re-verification at order creation), so both
// paths always agree on what a coupon is actually worth.
function computeDiscount(subtotal, coupon) {
  if (!coupon || subtotal <= 0) return 0;
  const raw = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return Math.min(raw, subtotal);
}

module.exports = { computeDiscount };
