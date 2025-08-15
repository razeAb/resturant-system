// routes/uploadRoute.js
const express = require("express");
const router = express.Router();
const imagekit = require("./imageKit");
const upload = require("./multer");

// Route for uploading an image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "HungryRestaurant",
    });

    res.json({ imageUrl: result.url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Image upload failed." });
  }
});

module.exports = router;
