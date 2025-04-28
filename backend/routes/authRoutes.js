const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ Helper to generate token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "❌ Invalid credentials." });

    const isMatch = await user.matchPassword(password); // Must be defined in User model
    if (!isMatch) return res.status(400).json({ message: "❌ Invalid credentials." });

    const token = generateToken(user._id);
    res.status(200).json({ message: "✅ Login successful.", token, user });
  } catch (error) {
    console.error("❌ Error logging in:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Firebase (Google) Login
router.post("/firebase-login", async (req, res) => {
  const { name, email, photo } = req.body;

  console.log("🔍 Firebase Login Attempt:");
  console.log("Received User Details:", { name, email, photo });

  try {
    // Find existing user
    let user = await User.findOne({ email });

    if (!user) {
      console.log("👤 No existing user found. Creating new user...");

      try {
        user = await User.create({
          name,
          email,
          photo,
          password: crypto.randomBytes(20).toString("hex"), // Secure random password
          isAdmin: false,
          orderCount: 0,
          points: 0,
        });

        console.log("✅ New Firebase User Created:", user.email);
      } catch (createError) {
        console.error("❌ User Creation Error:", createError);
        return res.status(500).json({
          message: "Failed to create user",
          details: createError.message,
        });
      }
    } else {
      console.log("👥 Existing user found:", user.email);

      // Optional: Update existing user's details
      if (photo && user.photo !== photo) {
        user.photo = photo;
        await user.save();
        console.log("🔄 User photo updated");
      }
    }

    const token = generateToken(user._id);

    console.log("🎉 Login Successful for:", email);
    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (error) {
    console.error("🚨 Firebase Login Error:", error);
    res.status(500).json({
      message: "Server error during Firebase login",
      details: error.message,
    });
  }
});

// ✅ Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, adminKey } = req.body;

    if (!name || !email || !password) return res.status(400).json({ message: "❌ All fields are required." });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "❌ User with this email already exists." });

    const isAdmin = adminKey === process.env.Admin_SECRET_KEY;

    const newUser = await User.create({
      name,
      email,
      password,
      phone,
      isAdmin: false,
      orderCount: 0,
      points: 0,
    });

    const token = generateToken(newUser._id);

    res.status(201).json({ message: "✅ User registered successfully.", user: newUser, token });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
