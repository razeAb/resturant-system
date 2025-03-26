const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware"); // Add isAdmin if needed

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

// ✅ Add a Single Product
router.post("/", protect, async (req, res) => {
  try {
    const { name, price, stock, description, image, category, isWeighted } = req.body;

    if (!name || !price || stock === undefined) {
      return res.status(400).json({ message: "❌ Name, price, and stock are required." });
    }

    const newProduct = new Product({ name, price, stock, description, image, category, isWeighted });
    await newProduct.save();

    res.status(201).json({ message: "✅ Product added successfully.", product: newProduct });
  } catch (error) {
    console.error("❌ Error adding product:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Add Multiple Products
router.post("/add-products", protect, async (req, res) => {
  try {
    const products = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "❌ Products array required." });
    }

    await Product.insertMany(products);
    res.status(201).json({ message: "✅ Products added successfully." });
  } catch (error) {
    console.error("❌ Error adding products:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Edit/Update Product by ID
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, price, stock, description, image, category, isWeighted } = req.body;
    const productId = req.params.id;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { name, price, stock, description, image, category, isWeighted },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "❌ Product not found." });
    }

    res.status(200).json({ message: "✅ Product updated successfully.", product: updatedProduct });
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Delete Product by ID
router.delete("/:id", protect, async (req, res) => {
  try {
    const productId = req.params.id;

    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({ message: "❌ Product not found." });
    }

    res.status(200).json({ message: "✅ Product deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
