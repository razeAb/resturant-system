const Restaurant = require("../models/Restaurant");

async function ensureDefaultRestaurant() {
  const existing = await Restaurant.findOne();
  if (existing) return existing;
  return Restaurant.create({ name: "Hungry Smoked Meat", active: true });
}

module.exports = { ensureDefaultRestaurant };
