const { connect, disconnect, clear } = require("./setup/db");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const { guardOrderPricing } = require("../utils/orderPricingGuard");

beforeAll(async () => await connect());
afterAll(async () => await disconnect());
afterEach(async () => await clear());

const makeProduct = (overrides = {}) =>
  Product.create({ name: "Test Burger", price: 40, stock: 100, category: "Meats", ...overrides });

describe("guardOrderPricing", () => {
  test("accepts a correctly priced order", async () => {
    const product = await makeProduct();
    const result = await guardOrderPricing({
      items: [{ product: product._id, price: 40, quantity: 2, isWeighted: false }],
      userId: null,
      deliveryFee: 0,
    });
    expect(result.error).toBeUndefined();
    expect(result.minTotal).toBe(80);
  });

  test("rejects a tampered (underpriced) item", async () => {
    const product = await makeProduct();
    const result = await guardOrderPricing({
      items: [{ product: product._id, price: 1, quantity: 2, isWeighted: false }],
      userId: null,
      deliveryFee: 0,
    });
    expect(result.error).toBeDefined();
  });

  test("rejects an order referencing a nonexistent product", async () => {
    const result = await guardOrderPricing({
      items: [{ product: new mongoose.Types.ObjectId(), price: 40, quantity: 1, isWeighted: false }],
      userId: null,
      deliveryFee: 0,
    });
    expect(result.error).toBeDefined();
  });

  test("computes floor correctly for weighted items (per-100g pricing)", async () => {
    const product = await makeProduct({ price: 10, category: "Weighted Meat" });
    const result = await guardOrderPricing({
      items: [{ product: product._id, price: 10, quantity: 250, isWeighted: true }],
      userId: null,
      deliveryFee: 0,
    });
    expect(result.error).toBeUndefined();
    expect(result.minTotal).toBe(25);
  });

  test("uses the minimum portionOptions price as the floor when present", async () => {
    const product = await makeProduct({
      price: 999,
      portionOptions: [
        { label_he: "small", price: 20 },
        { label_he: "large", price: 35 },
      ],
    });
    const result = await guardOrderPricing({
      items: [{ product: product._id, price: 20, quantity: 1, isWeighted: false }],
      userId: null,
      deliveryFee: 0,
    });
    expect(result.error).toBeUndefined();
    expect(result.minTotal).toBe(20);
  });

  test("re-verifies coupon discount from the real Coupon record, ignoring client input", async () => {
    const product = await makeProduct({ price: 100 });
    await Coupon.create({ code: "SAVE10", type: "percent", value: 10, active: true });
    const result = await guardOrderPricing({
      items: [{ product: product._id, price: 100, quantity: 1, isWeighted: false }],
      userId: null,
      couponCode: "save10",
      deliveryFee: 0,
    });
    expect(result.error).toBeUndefined();
    expect(result.minTotal).toBe(90);
  });

  test("rejects an invalid/inactive coupon code", async () => {
    const product = await makeProduct({ price: 100 });
    const result = await guardOrderPricing({
      items: [{ product: product._id, price: 100, quantity: 1, isWeighted: false }],
      userId: null,
      couponCode: "NOPE",
      deliveryFee: 0,
    });
    expect(result.error).toBeDefined();
  });

  test("allows exactly one free item for an eligible drink-loyalty reward", async () => {
    const drink = await makeProduct({ price: 15, category: "Drinks" });
    const user = await User.create({ name: "Loyal", email: "loyal@test.com", password: "x", orderCount: 6, usedDrinkCoupon: false });
    const result = await guardOrderPricing({
      items: [{ product: drink._id, price: 0, quantity: 1, isWeighted: false }],
      userId: user._id,
      couponUsed: "drink",
      deliveryFee: 0,
    });
    expect(result.error).toBeUndefined();
    expect(result.minTotal).toBe(0);
  });

  test("rejects a free item claimed under couponUsed if the user isn't actually eligible", async () => {
    const drink = await makeProduct({ price: 15, category: "Drinks" });
    const user = await User.create({ name: "NotYet", email: "notyet@test.com", password: "x", orderCount: 2, usedDrinkCoupon: false });
    const result = await guardOrderPricing({
      items: [{ product: drink._id, price: 0, quantity: 1, isWeighted: false }],
      userId: user._id,
      couponUsed: "drink",
      deliveryFee: 0,
    });
    expect(result.error).toBeDefined();
  });

  test("rejects a free item claimed under couponUsed if the category doesn't match", async () => {
    const steak = await makeProduct({ price: 80, category: "Meats" });
    const user = await User.create({ name: "Loyal2", email: "loyal2@test.com", password: "x", orderCount: 6, usedDrinkCoupon: false });
    const result = await guardOrderPricing({
      items: [{ product: steak._id, price: 0, quantity: 1, isWeighted: false }],
      userId: user._id,
      couponUsed: "drink",
      deliveryFee: 0,
    });
    expect(result.error).toBeDefined();
  });

  test("only allows a single free item even with couponUsed set", async () => {
    const drink = await makeProduct({ price: 15, category: "Drinks" });
    const drink2 = await makeProduct({ price: 15, category: "Drinks" });
    const user = await User.create({ name: "Loyal3", email: "loyal3@test.com", password: "x", orderCount: 6, usedDrinkCoupon: false });
    const result = await guardOrderPricing({
      items: [
        { product: drink._id, price: 0, quantity: 1, isWeighted: false },
        { product: drink2._id, price: 0, quantity: 1, isWeighted: false },
      ],
      userId: user._id,
      couponUsed: "drink",
      deliveryFee: 0,
    });
    expect(result.error).toBeDefined();
  });

  test("adds deliveryFee on top of the item floor", async () => {
    const product = await makeProduct({ price: 40 });
    const result = await guardOrderPricing({
      items: [{ product: product._id, price: 40, quantity: 1, isWeighted: false }],
      userId: null,
      deliveryFee: 25,
    });
    expect(result.minTotal).toBe(65);
  });
});
