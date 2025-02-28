const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ Login a user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "❌ Invalid credentials." });
    }

    // ✅ Compare the entered password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ Invalid credentials." });
    }

    // ✅ Generate JWT Token

    console.log("JWT Secret:", process.env.JWT_SECRET); // ✅ Debugging

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    res.status(200).json({ message: "✅ Login successful.", token });
  } catch (error) {
    console.error("❌ Error logging in:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Register a new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // ✅ Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "❌ All fields are required." });
    }

    // ✅ Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "❌ User with this email already exists." });
    }

    // ✅ Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword, // 🔹 Save the hashed password
      phone,
    });

    res.status(201).json({ message: "✅ User registered successfully.", user: newUser });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
