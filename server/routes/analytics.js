const express = require("express");
const pool = require("../db");
const { authenticateToken, allowRoles } = require("../middleware/auth");

const router = express.Router();

function periodBounds(period) {
  const now = new Date();
  const end = now;

  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "Today" };
  }

  if (period === "week") {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "This week" };
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, label: "This month" };
  }

  return null;
}

/** Date window in MySQL session timezone (avoids JS Date ↔ DATETIME skew). */
function periodDateFilter(column, period) {
  if (period === "day") {
    return `${column} >= CURDATE() AND ${column} < CURDATE() + INTERVAL 1 DAY`;
  }
  if (period === "week") {
    return `${column} >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND ${column} <= NOW()`;
  }
  if (period === "month") {
    return `${column} >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND ${column} <= NOW()`;
  }
  return null;
}

async function metricsForBranch(branchId, period) {
  const saleWhen = periodDateFilter("sale_datetime", period);
  const returnWhen = periodDateFilter("return_datetime", period);
  const purchaseWhen = periodDateFilter("purchase_datetime", period);

  if (!saleWhen || !returnWhen || !purchaseWhen) {
    throw new Error(`Invalid analytics period: ${period}`);
  }

  const [billed] = await pool.execute(
    `SELECT COALESCE(SUM(grand_total), 0) AS total
     FROM sales
     WHERE branch_id = ?
       AND status = 'FINALIZED'
       AND sale_type = 'BILLED'
       AND ${saleWhen}`,
    [branchId]
  );

  const [unbilled] = await pool.execute(
    `SELECT COALESCE(SUM(grand_total), 0) AS total
     FROM sales
     WHERE branch_id = ?
       AND status = 'FINALIZED'
       AND sale_type = 'UNBILLED'
       AND ${saleWhen}`,
    [branchId]
  );

  const [returns] = await pool.execute(
    `SELECT COALESCE(SUM(return_total), 0) AS total
     FROM customer_returns
     WHERE branch_id = ?
       AND ${returnWhen}`,
    [branchId]
  );

  const [purchases] = await pool.execute(
    `SELECT COALESCE(SUM(grand_total), 0) AS total
     FROM purchases
     WHERE branch_id = ?
       AND status = 'FINALIZED'
       AND ${purchaseWhen}`,
    [branchId]
  );

  const grossBilled = Number(billed[0].total);
  const unbilledTotal = Number(unbilled[0].total);
  const customerReturns = Number(returns[0].total);
  const stockPurchases = Number(purchases[0].total);
  const netTotal = grossBilled + unbilledTotal - customerReturns;

  return {
    grossBilled,
    unbilledTotal,
    customerReturns,
    stockPurchases,
    netTotal,
  };
}

router.get("/branch", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "SHOP_USER") {
      return res.status(403).json({
        success: false,
        message: "Shop branch analytics only.",
      });
    }

    const branchId = Number(req.user.branchId);
    const periods = ["day", "week", "month"];
    const result = {};

    for (const period of periods) {
      const bounds = periodBounds(period);
      if (!bounds) continue;
      result[period] = {
        label: bounds.label,
        ...(await metricsForBranch(branchId, period)),
      };
    }

    res.json({ success: true, branchId, analytics: result });
  } catch (error) {
    console.error("Branch analytics error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load analytics." });
  }
});

router.get(
  "/admin",
  authenticateToken,
  allowRoles("ADMIN"),
  async (req, res) => {
    try {
      const period = ["day", "week", "month"].includes(req.query.period)
        ? req.query.period
        : "day";
      const bounds = periodBounds(period);
      if (!bounds) {
        return res.status(400).json({ success: false, message: "Invalid period." });
      }

      const [branches] = await pool.query(
        `SELECT branch_id, branch_code, branch_name, gstin, is_active
         FROM branches ORDER BY branch_id`
      );

      const byBranch = [];
      let overall = {
        grossBilled: 0,
        unbilledTotal: 0,
        customerReturns: 0,
        stockPurchases: 0,
        netTotal: 0,
      };

      for (const branch of branches) {
        if (!branch.is_active) continue;
        const m = await metricsForBranch(branch.branch_id, period);
        byBranch.push({
          branchId: branch.branch_id,
          branchCode: branch.branch_code,
          branchName: branch.branch_name,
          gstin: branch.gstin,
          ...m,
        });
        overall.grossBilled += m.grossBilled;
        overall.unbilledTotal += m.unbilledTotal;
        overall.customerReturns += m.customerReturns;
        overall.stockPurchases += m.stockPurchases;
        overall.netTotal += m.netTotal;
      }

      res.json({
        success: true,
        period,
        label: bounds.label,
        overall,
        byBranch,
      });
    } catch (error) {
      console.error("Admin analytics error:", error.message);
      res.status(500).json({ success: false, message: "Unable to load admin analytics." });
    }
  }
);

module.exports = router;
