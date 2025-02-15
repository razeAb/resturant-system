const express = require("express");
const router = express.Router();
const User = require("../models/User");

// ✅ Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ message: "✅ All users fetched successfully.", users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "❌ User not found." });
    }
    res.status(200).json({ message: "✅ User found.", user });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
