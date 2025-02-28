const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware"); // ✅ Import protect middleware

// ✅ Get all users (Admin Only)
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ message: "✅ All users fetched successfully.", users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get user by ID
router.get("/:id", protect, async (req, res) => {
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

// ✅ Get user profile (Protected)
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password"); // Exclude password from response

    if (!user) {
      return res.status(404).json({ message: "❌ User not found." });
    }

    res.status(200).json({ message: "✅ User profile retrieved.", user });
  } catch (error) {
    console.error("❌ Error retrieving profile:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

module.exports = router;
