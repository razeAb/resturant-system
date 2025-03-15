const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware"); // If Admin-only, require authentication

// ✅ Get All Products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ message: "✅ Products fetched successfully.", products });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Add a New Product (Admin Only)
router.post("/", protect, async (req, res) => {
  try {
    const { name, price, stock, description, image } = req.body;

    if (!name || !price || !stock) {
      return res.status(400).json({ message: "❌ Name, price, and stock are required." });
    }

    const newProduct = new Product({ name, price, stock, description, image });
    await newProduct.save();

    res.status(201).json({ message: "✅ Product added successfully.", product: newProduct });
  } catch (error) {
    console.error("❌ Error adding product:", error);
    res.status(500).json({ message: error.message });
  }
});

// adding multiple products
router.post("/add-products", protect, async (req, res) => {
  try {
    const products = req.body;

    //validating input
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "products array required dear sir." });
    }

    await Product.insertMany(products);

    res.status(201).json({ message: "products were added sir." });
  } catch (error) {
    console.error("error adding products: ", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
