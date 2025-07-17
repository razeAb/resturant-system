// routes/uploadRoute.js
const express = require("express");
const router = express.Router();
const cloudinary = require("../cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary Storage with Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "HungryRestaurant",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// Multer middleware configured to use Cloudinary
const upload = multer({ storage });

// Route for uploading an image
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    // Ensure file exists after upload
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Successfully return the Cloudinary image URL
    res.json({ imageUrl: req.file.path });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Image upload failed." });
  }
});

module.exports = router;
