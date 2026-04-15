const express = require("express");
const router = express.Router();
const Worker = require("../models/Worker");
const Shift = require("../models/Shift");
const { protect } = require("../middleware/authMiddleware");
const { workerProtect } = require("../middleware/workerAuthMiddleware");
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
    const safeWorker = worker.toObject();
    delete safeWorker.password;
    res.status(201).json({ message: "✅ Worker created", worker: safeWorker });
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

// Admin: delete worker + shifts
router.delete("/:id", protect, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "❌ Unauthorized" });
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "❌ Worker not found" });
    await Shift.deleteMany({ user: worker._id });
    await worker.deleteOne();
    res.json({ message: "✅ Worker removed" });
  } catch (err) {
    console.error("Error deleting worker:", err);
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
    // Note: starting/stopping shifts is handled via `/api/shifts/*`.
    // Keep login side-effect free so Worker.onShift reflects real active shifts.
    const activeShift = await Shift.findOne({ user: worker._id, end: null }).sort({ start: -1 }).lean();
    const onShift = Boolean(activeShift);
    const shiftStart = activeShift?.start || null;

    // Best-effort sync in case legacy code left stale onShift values.
    if (worker.onShift !== onShift || String(worker.shiftStart || "") !== String(shiftStart || "")) {
      worker.onShift = onShift;
      worker.shiftStart = shiftStart;
      await worker.save();
    }
    const token = generateToken(worker._id);
    res.json({
      message: "✅ Logged in",
      token,
      worker: {
        _id: worker._id,
        username: worker.username,
        role: worker.role,
        shiftStart,
        onShift,
      },
    });
  } catch (err) {
    console.error("Worker login error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Worker: get own profile
router.get("/me", workerProtect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
