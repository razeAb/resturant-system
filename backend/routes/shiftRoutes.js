// routes/shifts.js
const express = require("express");
const router = express.Router();

const Shift = require("../models/Shift");
const Worker = require("../models/Worker"); // ✅ נדרש כדי לעדכן onShift
const { protect } = require("../middleware/authMiddleware"); // Admin protect
const { workerProtect } = require("../middleware/workerAuthMiddleware"); // Worker protect

/* ───────────────────────── Helpers ───────────────────────── */

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hoursBetween(start, end, breakMinutes = 0) {
  const raw = (end - start) / 3600000; // ms → hours
  const final = Math.max(0, raw - (Number(breakMinutes) || 0) / 60);
  return Number(final.toFixed(2));
}

/* ─────────────────────── Worker self routes ─────────────────────── */

// Start a shift
router.post("/start", workerProtect, async (req, res) => {
  try {
    const workerId = req.user._id;

    // לא לאפשר שתי משמרות פעילות במקביל
    const existing = await Shift.findOne({ user: workerId, end: null });
    if (existing) {
      return res.status(400).json({ message: "Shift already active" });
    }

    const now = new Date();
    const shift = await Shift.create({
      user: workerId,
      start: now,
      // אפשר לשמור breakMinutes כברירת מחדל 0 אם יש בשchema
      // breakMinutes: 0
    });

    // ✅ עדכון סטטוס העובד
    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
      { onShift: true },
      { new: true, lean: true, select: "username role onShift" }
    );

    // 🔔 אופציונלי: שליחת אירוע Socket.IO ל-Admin
    // const io = req.app.get("io");
    // io?.emit("worker:shiftUpdate", { workerId, onShift: true });

    return res.status(201).json({ shift, worker: updatedWorker });
  } catch (err) {
    console.error("Shift start error:", err);
    return res.status(500).json({ message: err.message || "Failed to start shift" });
  }
});

// Stop current shift
router.post("/stop", workerProtect, async (req, res) => {
  try {
    const workerId = req.user._id;

    const shift = await Shift.findOne({ user: workerId, end: null });
    if (!shift) {
      return res.status(404).json({ message: "No active shift" });
    }

    const now = new Date();
    shift.end = now;

    // אם breakMinutes קיים בשדה – ניקח אותו, אחרת 0
    const breakMin = typeof shift.breakMinutes === "number" ? shift.breakMinutes : 0;
    shift.hours = hoursBetween(shift.start, shift.end, breakMin);

    await shift.save();

    // ✅ עדכון סטטוס העובד
    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
      { onShift: false },
      { new: true, lean: true, select: "username role onShift" }
    );

    // 🔔 אופציונלי: שליחת אירוע Socket.IO ל-Admin
    // const io = req.app.get("io");
    // io?.emit("worker:shiftUpdate", { workerId, onShift: false });

    return res.json({ shift, worker: updatedWorker });
  } catch (err) {
    console.error("Shift stop error:", err);
    return res.status(500).json({ message: err.message || "Failed to end shift" });
  }
});

// Get shifts for current worker
router.get("/", workerProtect, async (req, res) => {
  try {
    const shifts = await Shift.find({ user: req.user._id }).sort({ start: -1 });
    return res.json(shifts);
  } catch (err) {
    console.error("Get worker shifts error:", err);
    return res.status(500).json({ message: err.message || "Failed to load shifts" });
  }
});

/* ───────────────────────── Admin routes ───────────────────────── */

// Admin: start a shift for a worker
router.post("/admin/start/:workerId", protect, async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ message: "Not authorized" });

  try {
    const { workerId } = req.params;

    // avoid double active shifts
    const existing = await Shift.findOne({ user: workerId, end: null });
    if (existing) {
      return res.status(400).json({ message: "Shift already active for this worker" });
    }

    const now = new Date();
    const shift = await Shift.create({ user: workerId, start: now });

    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
      { onShift: true, shiftStart: now },
      { new: true, lean: true, select: "username role onShift shiftStart" }
    );

    return res.status(201).json({ shift, worker: updatedWorker });
  } catch (err) {
    console.error("Admin start shift error:", err);
    return res.status(500).json({ message: err.message || "Failed to start shift" });
  }
});

// Admin: stop a worker's current shift
router.post("/admin/stop/:workerId", protect, async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ message: "Not authorized" });

  try {
    const { workerId } = req.params;
    const shift = await Shift.findOne({ user: workerId, end: null });

    if (!shift) {
      return res.status(404).json({ message: "No active shift for this worker" });
    }

    const now = new Date();
    shift.end = now;
    const breakMin = typeof shift.breakMinutes === "number" ? shift.breakMinutes : 0;
    shift.hours = hoursBetween(shift.start, shift.end, breakMin);
    await shift.save();

    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
      { onShift: false, shiftStart: null },
      { new: true, lean: true, select: "username role onShift shiftStart" }
    );

    return res.json({ shift, worker: updatedWorker });
  } catch (err) {
    console.error("Admin stop shift error:", err);
    return res.status(500).json({ message: err.message || "Failed to end shift" });
  }
});


// Get all shifts (admin only) + filters: ?worker=<id>&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/all", protect, async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ message: "Not authorized" });

  try {
    const { worker, start, end } = req.query;
    const query = {};

    if (worker) query.user = worker;

    if (start || end) {
      const s = start ? toDateOrNull(start) : null;
      const e = end ? toDateOrNull(end) : null;

      // נסנן לפי start של המשמרת
      query.start = {};
      if (s) query.start.$gte = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
      if (e) {
        const endOfDay = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
        query.start.$lte = endOfDay;
      }
      // אם שניהם null – ננקה את המפתח
      if (!s && !e) delete query.start;
    }

    const shifts = await Shift.find(query).populate("user", "username role onShift").sort({ start: -1 });

    return res.json(shifts);
  } catch (err) {
    console.error("Get all shifts error:", err);
    return res.status(500).json({ message: err.message || "Failed to load shifts" });
  }
});

// Manager adjust shift (hours OR start/end/break) – admin only
router.put("/:id", protect, async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ message: "Not authorized" });

  try {
    const { hours, start, end, breakMinutes } = req.body;

    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    let adjusted = false;

    // 1) עדכון ישיר של שעות אם קיים
    if (typeof hours === "number" && !Number.isNaN(hours)) {
      shift.hours = Math.max(0, Number(hours));
      adjusted = true;
    }

    // 2) עדכון לפי start/end/breakMinutes → חישוב שעות מחדש
    let newStart = start ? toDateOrNull(start) : shift.start;
    let newEnd = end ? toDateOrNull(end) : shift.end;
    let newBreak =
      typeof breakMinutes === "number" && !Number.isNaN(breakMinutes)
        ? Math.max(0, Number(breakMinutes))
        : typeof shift.breakMinutes === "number"
        ? shift.breakMinutes
        : 0;

    // אם נשלח לפחות start או end – נוודא ולידציה בסיסית
    const touchedDetailed = Boolean(start || end || typeof breakMinutes === "number");

    if (touchedDetailed) {
      if (!newStart || !newEnd) {
        return res.status(400).json({ message: "Both start and end are required for detailed update" });
      }
      if (newEnd <= newStart) {
        return res.status(400).json({ message: "End time must be after start time" });
      }

      shift.start = newStart;
      shift.end = newEnd;
      shift.breakMinutes = newBreak;
      shift.hours = hoursBetween(newStart, newEnd, newBreak);
      adjusted = true;
    }

    if (!adjusted) {
      return res.status(400).json({
        message: "Nothing to update. Provide 'hours' or 'start'+'end' (optionally 'breakMinutes').",
      });
    }

    // סימון שהמשמרת עודכנה ע״י מנהל
    shift.adjustedByManager = true;
    shift.adjustedAt = new Date();
    shift.adjustedBy = req.user._id; // אופציונלי, אם יש שדה כזה בסכמה

    await shift.save();

    return res.json(shift);
  } catch (err) {
    console.error("Adjust shift error:", err);
    return res.status(500).json({ message: err.message || "Failed to update shift" });
  }
});

module.exports = router;
