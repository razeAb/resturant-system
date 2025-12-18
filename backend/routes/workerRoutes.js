const express = require("express");
const router = express.Router();
const Worker = require("../models/Worker");
const { protect } = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");

const generateToken = (id) => jwt.sign({ workerId: id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// Admin: create worker
router.post("/", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ message: "❌ All fields are required" });
    const exists = await Worker.findOne({ username });
    if (exists) return res.status(400).json({ message: "❌ Username already exists" });
    const worker = await Worker.create({ username, password, role });
    res.status(201).json({ message: "✅ Worker created", worker });
  } catch (err) {
    console.error("Error creating worker:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: list workers
router.get("/", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const workers = await Worker.find().select("-password");
    res.json({ workers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Worker login -> start shift
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const worker = await Worker.findOne({ username });
    if (!worker || !(await worker.matchPassword(password))) {
      return res.status(400).json({ message: "❌ Invalid credentials" });
    }
    worker.onShift = true;
    worker.shiftStart = new Date();
    await worker.save();
    const token = generateToken(worker._id);
    res.json({
      message: "✅ Shift started",
      token,
      worker: {
        _id: worker._id,
        username: worker.username,
        role: worker.role,
        shiftStart: worker.shiftStart,
        onShift: worker.onShift,
      },
    });
  } catch (err) {
    console.error("Worker login error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
