const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const PaymentFeeRule = require("../models/PaymentFeeRule");
const Expense = require("../models/Expense");

function toMonthKey(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function monthRange(start, end) {
  const startDate = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);
  const months = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    months.push(toMonthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function weeksInMonth(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return Math.ceil((end - start + 1) / (7 * 24 * 60 * 60 * 1000));
}

router.get("/revenue", async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date("1970-01-01");
    const endDate = end ? new Date(end) : new Date();

    // Fetch data
    const [orders, feeRules, expenses] = await Promise.all([
      Order.find({
        status: { $in: ["paid", "done"] },
        paidAt: { $gte: startDate, $lte: endDate },
      }).populate("items.product"),
      PaymentFeeRule.find({ active: true }).lean(),
      Expense.find({ active: true }).lean(),
    ]);

    const feeMap = new Map(feeRules.map((r) => [r.paymentMethod, r]));
    const months = {};

    for (const order of orders) {
      const paidAt = order.paidAt || order.createdAt;
      if (!paidAt) continue;
      const key = toMonthKey(paidAt);
      if (!months[key]) {
        months[key] = { month: key, gross: 0, cogs: 0, paymentFees: 0, fixed: 0, labor: 0, net: 0, margin: 0 };
      }

      const record = months[key];
      const gross = Number(order.totalPrice || order.total || 0);
      record.gross += gross;

      let cogs = 0;
      for (const item of order.items || []) {
        const qty = item.quantity || 1;
        let cost = item.cogsAtPurchase;
        if (cost == null && item.product && item.product.cogsPerUnit != null) {
          cost = item.product.cogsPerUnit;
        }
        cost = Number(cost || 0);
        cogs += cost * qty;
      }
      record.cogs += cogs;

      const method = order.paymentDetails?.method;
      if (method && feeMap.has(method)) {
        const rule = feeMap.get(method);
        const percentFee = gross * ((Number(rule.percent) || 0) / 100);
        const fixedFee = Number(rule.fixed) || 0;
        record.paymentFees += percentFee + fixedFee;
      }
    }

    // Calculate fixed expenses per month
    const monthKeys = monthRange(startDate, endDate);
    for (const key of monthKeys) {
      if (!months[key]) {
        months[key] = { month: key, gross: 0, cogs: 0, paymentFees: 0, fixed: 0, labor: 0, net: 0, margin: 0 };
      }
      const [y, m] = key.split("-").map((n) => parseInt(n, 10));
      const year = y;
      const month = m - 1; // JS month index
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      let fixedTotal = 0;
      for (const exp of expenses) {
        const expStart = exp.startDate ? new Date(exp.startDate) : startOfMonth;
        const expEnd = exp.endDate ? new Date(exp.endDate) : null;
        if (expStart > endOfMonth) continue;
        if (expEnd && expEnd < startOfMonth) continue;
        const amount = Number(exp.amount) || 0;
        if (exp.frequency === "monthly") {
          fixedTotal += amount;
        } else if (exp.frequency === "weekly") {
          fixedTotal += amount * weeksInMonth(year, month);
        } else if (exp.frequency === "one_time") {
          if (
            expStart.getFullYear() === year &&
            expStart.getMonth() === month
          ) {
            fixedTotal += amount;
          }
        }
      }
      months[key].fixed = fixedTotal;
    }

    // finalize
    for (const key of Object.keys(months)) {
      const rec = months[key];
      rec.net = rec.gross - (rec.cogs + rec.paymentFees + rec.fixed + rec.labor);
      rec.margin = rec.gross ? rec.net / rec.gross : 0;
    }

    const result = Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to calculate revenue" });
  }
});

module.exports = router;