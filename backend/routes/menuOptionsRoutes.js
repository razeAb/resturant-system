const express = require("express");
const router = express.Router();
const MenuOptions = require("../models/MenuOptions");
const { protect } = require("../middleware/authMiddleware");

const DEFAULT_MENU_OPTIONS = {
  vegetables: ["🥬 חסה", "🥒 מלפפון חמוץ", "🍅 עגבניה", "🧅 בצל", "🥗 סלט קרוב", "🌿 צימצורי"].map((name) => ({
    name,
    isActive: true,
  })),
  sauces: [
    "איולי סומק",
    "איולי חריף",
    "ברביקיו",
    "חלפיניו",
    "קונפי שום",
    "דבש",
    "2 שקיות קטשוב",
    "2 שקיות מיונז",
    "2 שקיית אליפאים",
    "חרדל דיגון",
  ].map((name) => ({ name, isActive: true })),
  weightedAdditions: [
    { name: "🥩 צלי כתף", pricePer50: 13, pricePer100: 26, isActive: true },
    { name: "🥩 אונטרייב", pricePer50: 13, pricePer100: 26, isActive: true },
    { name: "🥩 אסאדו", pricePer50: 15, pricePer100: 30, isActive: true },
    { name: "🥩 צוואר טלה", pricePer50: 15, pricePer100: 30, isActive: true },
    { name: "🥩 בריסקת", pricePer50: 13, pricePer100: 26, isActive: true },
  ],
  fixedAdditions: [
    { name: "🥓 ביקון טלה", price: 10, isActive: true },
    { name: "🧀 רוטב גבינה", price: 8, isActive: true },
    { name: "🍄 פטריות", price: 5, isActive: true },
    { name: "🥖 ג׳בטה", price: 5, isActive: true },
  ],
};

const getName = (item) => String(typeof item === "string" ? item : item?.name || "").trim();
const getIsActive = (item) => (typeof item === "object" && item !== null && item.isActive === false ? false : true);

const sanitize = (options = {}) => {
  const sanitizedVegetables = Array.isArray(options.vegetables)
    ? options.vegetables
        .map((v) => ({
          name: getName(v),
          isActive: getIsActive(v),
        }))
        .filter((item) => item.name)
    : [];

  const sanitizedSauces = Array.isArray(options.sauces)
    ? options.sauces
        .map((v) => ({
          name: getName(v),
          isActive: getIsActive(v),
        }))
        .filter((item) => item.name)
    : [];

  const sanitizedWeighted = Array.isArray(options.weightedAdditions)
    ? options.weightedAdditions
        .map((item) => ({
          name: String(item?.name || "").trim(),
          pricePer50: Number(item?.pricePer50) || 0,
          pricePer100: Number(item?.pricePer100) || 0,
          isActive: getIsActive(item),
        }))
        .filter((item) => item.name)
    : [];

  const sanitizedFixed = Array.isArray(options.fixedAdditions)
    ? options.fixedAdditions
        .map((item) => ({
          name: String(item?.name || "").trim(),
          price: Number(item?.price) || 0,
          isActive: getIsActive(item),
        }))
        .filter((item) => item.name)
    : [];

  return {
    vegetables: sanitizedVegetables,
    sauces: sanitizedSauces,
    weightedAdditions: sanitizedWeighted,
    fixedAdditions: sanitizedFixed,
  };
};

const getOrCreateOptions = async () => {
  let options = await MenuOptions.findOne();
  if (!options) {
    options = await MenuOptions.create(DEFAULT_MENU_OPTIONS);
  }
  return options;
};

router.get("/", async (req, res) => {
  try {
    const options = await getOrCreateOptions();
    res.json(options);
  } catch (error) {
    console.error("❌ Failed to load menu options:", error);
    res.status(500).json({ message: "❌ Failed to load menu options" });
  }
});

router.put("/", protect, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "❌ Unauthorized" });
    }

    const sanitized = sanitize(req.body || {});
    let options = await MenuOptions.findOne();
    if (!options) {
      options = new MenuOptions(DEFAULT_MENU_OPTIONS);
    }

    options.vegetables = sanitized.vegetables;
    options.sauces = sanitized.sauces;
    options.weightedAdditions = sanitized.weightedAdditions;
    options.fixedAdditions = sanitized.fixedAdditions;

    await options.save();

    res.json({ message: "✅ Menu options updated", options });
  } catch (error) {
    console.error("❌ Failed to update menu options:", error);
    res.status(500).json({ message: "❌ Failed to update menu options" });
  }
});

module.exports = router;
module.exports.DEFAULT_MENU_OPTIONS = DEFAULT_MENU_OPTIONS;
