const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");

router.get("/seed", async (req, res) => {
  try {
    await Category.deleteMany();
    const sample = await Category.insertMany([
      {
        name: "Sandwiches",
        vegetables: ["חסה", "עגבניה", "בצל"],
        additions: {
          fixed: [{ name: "גבינה", price: 5 }],
          grams: [],
        },
      },
      { name: "Drinks", vegetables: [], additions: { fixed: [], grams: [] } },
      { name: "Sides", vegetables: [], additions: { fixed: [], grams: [] } },
      { name: "Starters", vegetables: [], additions: { fixed: [], grams: [] } },
      {
        name: "Meats",
        vegetables: ["חסה", "בצל"],
        additions: {
          grams: [
            { name: "צלי כתף", prices: { 50: 13, 100: 26 } },
            { name: "אנטריקוט", prices: { 50: 15, 100: 30 } },
          ],
          fixed: [],
        },
      },
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
    const { name, vegetables = [], additions = { fixed: [], grams: [] } } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = new Category({ name, vegetables, additions });
    const saved = await category.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ PUT /api/categories/:id - Update a category
router.put("/:id", async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE /api/categories/:id - Remove a category
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
