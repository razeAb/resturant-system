const express = require("express");
const router = express.Router();

// Example route
router.get("/", (req, res) => {
  res.send("product API is working!");
});

module.exports = router; // ✅ Make sure this line exists!
