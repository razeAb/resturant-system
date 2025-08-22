const express = require("express");
const Floor = require("../models/Floor");
const { io } = require("../server");

const router = express.Router();

// GET /api/floors/:id
router.get("/:id", async (req, res) => {
  const floor = await Floor.findById(req.params.id);
  if (!floor) return res.status(404).json({ message: "Floor not found" });
  res.json(floor);
});

// PUT /api/floors/:id - replace floor
router.put("/:id", async (req, res) => {
  const floor = await Floor.findByIdAndUpdate(req.params.id, req.body, { new: true, upsert: true });
  io.to(`floor:${req.params.id}`).emit("floor_updated", { floorId: req.params.id });
  res.json(floor);
});

// PUT /api/floors/:id/tables/:tableId - update single table
router.put("/:id/tables/:tableId", async (req, res) => {
  const floor = await Floor.findById(req.params.id);
  if (!floor) return res.status(404).json({ message: "Floor not found" });
  const tableIndex = floor.tables.findIndex((t) => t.id === req.params.tableId);
  if (tableIndex === -1) return res.status(404).json({ message: "Table not found" });
  floor.tables[tableIndex] = { ...floor.tables[tableIndex].toObject(), ...req.body };
  await floor.save();
  const table = floor.tables[tableIndex];
  io.to(`floor:${req.params.id}`).emit("table_updated", { floorId: req.params.id, table });
  res.json(table);
});

module.exports = router;
