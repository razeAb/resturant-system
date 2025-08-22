const express = require("express");
const TableOrder = require("../models/TableOrder");
const { io } = require("../server");

const router = express.Router();

// POST /api/table-orders
router.post("/", async (req, res) => {
  const order = await TableOrder.create(req.body);
  io.to(`table:${order.tableId}`).emit("order_updated", { order });
  res.status(201).json(order);
});

// PUT /api/table-orders/:id/items
router.put("/:id/items", async (req, res) => {
  const order = await TableOrder.findByIdAndUpdate(req.params.id, { items: req.body.items }, { new: true });
  io.to(`table:${order.tableId}`).emit("order_updated", { order });
  res.json(order);
});

// PUT /api/table-orders/:id/fire?course=
router.put("/:id/fire", async (req, res) => {
  const { course } = req.query;
  const order = await TableOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  order.items.forEach((item) => {
    if (item.course === course && item.status === "queued") item.status = "fired";
  });
  await order.save();
  io.to(`table:${order.tableId}`).emit("order_updated", { order });
  res.json(order);
});

// GET /api/table-orders/active-by-table/:tableId
router.get("/active-by-table/:tableId", async (req, res) => {
  const order = await TableOrder.findOne({ tableId: req.params.tableId, status: "open" }).sort({ createdAt: -1 });
  res.json(order);
});

module.exports = router;
