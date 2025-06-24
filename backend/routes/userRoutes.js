const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware"); // ✅ Import protect middleware

// ✅ Get user profile with orders
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").populate("orders");

    if (!user) {
      return res.status(404).json({ message: "❌ User not found." });
    }

    res.status(200).json({
      message: "✅ User profile retrieved.",
      user,
      rewards: {
        points: user.points || 0, // Ensure points exist
        orderCount: user.orderCount || 0, // Ensure orderCount exists
        rewardMessage:
          (user.orderCount || 0) >= 10
            ? "🎉 Your next meal is free!"
            : (user.points || 0) >= 100
            ? "🎉 You've earned a free side dish!"
            : "Keep ordering to earn rewards!",
      },
    });
  } catch (error) {
    console.error("❌ Error retrieving profile:", error);
    res.status(500).json({ message: "❌ Server error." });
  }
});

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
// ✅ Update user fields (order count, coupon status, etc.)
router.patch("/:id", protect, async (req, res) => {
  try {
    const updates = {};
    if (req.body.orderCount !== undefined) updates.orderCount = req.body.orderCount;
    if (req.body.usedDrinkCoupon !== undefined)
      updates.usedDrinkCoupon = req.body.usedDrinkCoupon;

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!user) {
      return res.status(404).json({ message: "❌ User not found." });
    }

    res.status(200).json({ message: "✅ User updated.", user });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
