const express = require("express");
const router = express.Router();
const Shift = require("../models/Shift");
const { protect } = require("../middleware/authMiddleware");
const { workerProtect } = require("../middleware/workerAuthMiddleware");

// Start a shift
router.post("/start", workerProtect, async (req, res) => {
    try {
    const existing = await Shift.findOne({ user: req.user._id, end: null });
    if (existing) {
      return res.status(400).json({ message: "Shift already active" });
    }
    const shift = await Shift.create({ user: req.user._id, start: new Date() });
    res.status(201).json(shift);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stop current shift
router.post("/stop", workerProtect, async (req, res) => {
    try {
    const shift = await Shift.findOne({ user: req.user._id, end: null });
    if (!shift) return res.status(404).json({ message: "No active shift" });
    shift.end = new Date();
    shift.hours = (shift.end - shift.start) / 3600000; // ms to hours
    await shift.save();
    res.json(shift);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get shifts for current user
router.get("/", workerProtect, async (req, res) => {
    try {
    const shifts = await Shift.find({ user: req.user._id }).sort({ start: -1 });
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all shifts (admin only)
router.get("/all", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "Not authorized" });
  try {
    const shifts = await Shift.find().populate("user", "name").sort({ start: -1 });
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager adjust hours
router.put("/:id", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "Not authorized" });
  try {
    const { hours } = req.body;
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    shift.hours = hours;
    shift.adjustedByManager = true;
    shift.adjustedAt = new Date();
    await shift.save();
    res.json(shift);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;