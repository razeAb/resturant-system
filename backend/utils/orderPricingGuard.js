const Product = require("../models/Product");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const { computeDiscount } = require("./couponPricing");

// Small buffers to absorb rounding, never big enough to matter for tampering.
const LINE_TOLERANCE = 0.5;
const TOTAL_TOLERANCE = 1;

const REWARD_RULES = {
  drink: (user, category) => user.orderCount >= 5 && user.orderCount < 10 && !user.usedDrinkCoupon && category === "drinks",
  side: (user, category) => user.orderCount >= 10 && (category === "side" || category === "starters"),
};

// The lowest price this exact product could legitimately have been ordered for - additions,
// doneness, and extra-patty upcharges only ever add on top, so ignoring them still gives a
// safe floor. Weighted items are priced per 100g (quantity is grams, not a unit count).
function computeItemFloor(item, product) {
  const optionPrices = (product.portionOptions || []).map((o) => Number(o.price) || 0).filter((p) => p > 0);
  const minUnitPrice = optionPrices.length ? Math.min(...optionPrices) : Number(product.price) || 0;
  const qty = Number(item.quantity) || 0;
  return item.isWeighted ? minUnitPrice * (qty / 100) : minUnitPrice * qty;
}

function computeItemSubmittedTotal(item) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.price) || 0;
  return item.isWeighted ? price * (qty / 100) : price * qty;
}

// Re-derives a floor for the order total from the real Product/Coupon records, so a request
// can't just lower `items[].price`, `totalPrice`, or `couponDiscount` and pay less than the
// menu actually charges. Doesn't recompute the exact price (additions/sauces stay client-
// computed) - it only guarantees nothing is below what's mathematically possible.
// Returns { error } or { minTotal }.
async function guardOrderPricing({ items, userId, couponUsed, couponCode, deliveryFee }) {
  const productIds = items.map((it) => it.product);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const rewardRule = REWARD_RULES[couponUsed];
  const rewardUser = rewardRule && userId ? await User.findById(userId).select("orderCount usedDrinkCoupon").lean() : null;
  let rewardItemClaimed = false;

  let floorSubtotal = 0;
  for (const item of items) {
    const product = productMap.get(String(item.product));
    if (!product) return { error: "Order contains an item that no longer exists" };

    const floorLineTotal = computeItemFloor(item, product);
    const submittedLineTotal = computeItemSubmittedTotal(item);

    if (submittedLineTotal + LINE_TOLERANCE < floorLineTotal) {
      const category = String(product.category || "").toLowerCase();
      const eligibleForReward = !rewardItemClaimed && rewardRule && rewardUser && rewardRule(rewardUser, category);
      if (!eligibleForReward) {
        return { error: "Item price doesn't match the menu - please refresh your cart and try again" };
      }
      rewardItemClaimed = true;
      continue; // this single item is a verified loyalty reward - not counted at all
    }
    floorSubtotal += floorLineTotal;
  }

  let verifiedCouponDiscount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase(), active: true });
    if (!coupon) return { error: "Invalid or inactive coupon code" };
    verifiedCouponDiscount = computeDiscount(floorSubtotal, coupon);
  }

  const minTotal = Math.max(0, floorSubtotal - verifiedCouponDiscount) + (Number(deliveryFee) || 0);
  return { minTotal };
}

module.exports = { guardOrderPricing, LINE_TOLERANCE, TOTAL_TOLERANCE };
