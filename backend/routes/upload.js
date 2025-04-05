const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ✅ Make sure uploads folder exists
const uploadPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// ✅ Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); // where files go
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// ✅ POST /api/upload
router.post("/", upload.single("image"), (req, res) => {
  console.log("Request received:", req.body);
  console.log("File details:", req.file);
  if (!req.file) {
    console.log("No file received in upload request");
    return res.status(400).json({ message: "No image uploaded." });
  }

  const imageUrl = `http://localhost:5001/uploads/${req.file.filename}`;
  console.log("File saved at:", path.join(uploadPath, req.file.filename));
  res.json({ imageUrl });
});
module.exports = router;
