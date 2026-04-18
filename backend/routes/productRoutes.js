const express = require("express");
const router = express.Router();
const multer = require("multer");

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

// ✅ Get Single Product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "❌ Product not found." });
    res.status(200).json({ message: "✅ Product fetched successfully.", product });
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Add a Single Product
router.post("/", protect, async (req, res) => {
  try {
    const { name, price, stock, description, image, category, isWeighted, fullSandwichPrice, extraPattyPrice, portionOptions } = req.body;

    if (!name || !price || stock === undefined) {
      return res.status(400).json({ message: "❌ Name, price, and stock are required." });
    }

    const sanitizedPortionOptions = Array.isArray(portionOptions)
      ? portionOptions
          .map((opt) => ({
            label_he: String(opt?.label_he || "").trim(),
            label_en: String(opt?.label_en || "").trim(),
            price: Number(opt?.price) || 0,
          }))
          .filter((opt) => (opt.label_he || opt.label_en) && opt.price > 0)
      : [];

    const newProduct = new Product({
      name,
      price,
      stock,
      description,
      image,
      category,
      isWeighted,
      fullSandwichPrice,
      extraPattyPrice,
      portionOptions: sanitizedPortionOptions,
    });
    await newProduct.save();

    res.status(201).json({ message: "✅ Product added successfully.", product: newProduct });
  } catch (error) {
    console.error("❌ Error adding product:", error);
    res.status(500).json({ message: error.message });
  }
});

//Patch product toggle
router.patch("/:id/toggle-active", async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await Product.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product status" });
  }
});

// ✅ Activate all products (open restaurant)
router.patch("/activate-all", protect, async (req, res) => {
  try {
    await Product.updateMany({}, { isActive: true });
    res.json({ message: "All products activated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate all products" });
  }
});

// ✅ Deactivate all products (close restaurant)
router.patch("/deactivate-all", protect, async (req, res) => {
  try {
    await Product.updateMany({}, { isActive: false });
    res.json({ message: "All products deactivated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate all products" });
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
    const { name, price, stock, description, image, category, isWeighted, fullSandwichPrice, extraPattyPrice, portionOptions } = req.body;
    const productId = req.params.id;

    const sanitizedPortionOptions = Array.isArray(portionOptions)
      ? portionOptions
          .map((opt) => ({
            label_he: String(opt?.label_he || "").trim(),
            label_en: String(opt?.label_en || "").trim(),
            price: Number(opt?.price) || 0,
          }))
          .filter((opt) => (opt.label_he || opt.label_en) && opt.price > 0)
      : undefined;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        price,
        stock,
        description,
        image,
        category,
        isWeighted,
        fullSandwichPrice,
        extraPattyPrice,
        ...(sanitizedPortionOptions !== undefined ? { portionOptions: sanitizedPortionOptions } : {}),
      },
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
