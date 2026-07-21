const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

// ✅ Helper to generate token (extended expiry to avoid forced logout)
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
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
    let user = await User.findOne({ email });

    if (!user) {
      console.log("👤 No existing user found. Creating new user...");

      user = await User.create({
        name,
        email,
        photo,
        password: require("crypto").randomBytes(20).toString("hex"), // Secure random password
        isAdmin: false,
        orderCount: 0,
        points: 0,
      });

      console.log("✅ New Firebase User Created:", user.email);
    } else {
      console.log("👥 Existing user found:", user.email);

      let changed = false;

      // 🖼️ Update photo if changed
      if (photo && user.photo !== photo) {
        user.photo = photo;
        changed = true;
        console.log("🔄 User photo updated");
      }

      // ✅ Add missing fields if needed
      if (user.orderCount === undefined) {
        user.orderCount = 0;
        changed = true;
        console.log("🧾 orderCount initialized to 0");
      }

      if (user.points === undefined) {
        user.points = 0;
        changed = true;
        console.log("⭐ points initialized to 0");
      }

      if (changed) {
        await user.save();
        console.log("💾 User updated with new fields");
      }
    }

    const token = generateToken(user._id);

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

// ✅ Google Sign-In (driver app "Admin Mode") - unlike /firebase-login, this actually
// verifies the Google ID token server-side rather than trusting client-sent fields, since
// it's used to gate admin access rather than just a regular customer account.
router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "❌ idToken is required" });
    if (!process.env.GOOGLE_WEB_CLIENT_ID) {
      return res.status(500).json({ message: "❌ Google sign-in isn't configured on the server" });
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_WEB_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(401).json({ message: "❌ Invalid Google token" });

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: payload.name || payload.email,
        email: payload.email,
        photo: payload.picture,
        password: require("crypto").randomBytes(20).toString("hex"),
        isAdmin: false,
        orderCount: 0,
        points: 0,
      });
    }

    const token = generateToken(user._id);
    res.status(200).json({ message: "✅ Login successful.", token, user });
  } catch (error) {
    console.error("❌ Google login error:", error.message);
    res.status(401).json({ message: "❌ Invalid Google token" });
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
