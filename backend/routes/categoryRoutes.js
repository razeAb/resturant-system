const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");

router.get("/seed", async (req, res) => {
  try {
    await Category.deleteMany();
    const sample = await Category.insertMany([
      { name: "Sandwiches" },
      { name: "Drinks" },
      { name: "Sides" },
      { name: "Starters" },
      { name: "Meats" },
    ]);
    res.status(201).json(sample);
  } catch (err) {
    res.status(500).json({ message: "Failed to seed categories" });
  }
});

// ✅ GET /api/categories - Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ POST /api/categories - Create a new category
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = new Category({ name });
    const saved = await category.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
