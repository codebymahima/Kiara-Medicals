const express = require("express");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const LOW_STOCK_UNITS = 10;
const EXPIRY_DAYS = 30;

router.get("/", authenticateToken, async (req, res) => {
  try {
    let branchFilter = null;

    if (req.user.role === "SHOP_USER") {
      branchFilter = req.user.branchId;
    } else if (req.query.branchId) {
      branchFilter = String(req.query.branchId).trim();
      if (!/^\d+$/.test(branchFilter)) {
        return res.status(400).json({ success: false, message: "Invalid branchId." });
      }
    }

    let lowStockSql = `
      SELECT
        b.branch_id,
        b.branch_name,
        p.product_id,
        p.product_name,
        p.brand,
        SUM(
          i.quantity * COALESCE(p.units_per_stock_unit, 1) + i.loose_quantity
        ) AS total_smallest_units
      FROM inventory i
      JOIN batches ba ON ba.batch_id = i.batch_id AND ba.branch_id = i.branch_id
      JOIN products p ON p.product_id = ba.product_id
      JOIN branches b ON b.branch_id = i.branch_id
      WHERE p.is_active = TRUE
    `;
    const lowParams = [];

    if (branchFilter) {
      lowStockSql += " AND i.branch_id = ?";
      lowParams.push(branchFilter);
    }

    lowStockSql += `
      GROUP BY b.branch_id, b.branch_name, p.product_id, p.product_name, p.brand
      HAVING total_smallest_units <= ?
      ORDER BY total_smallest_units ASC, p.product_name ASC
      LIMIT 100
    `;
    lowParams.push(LOW_STOCK_UNITS);

    const [lowStock] = await pool.query(lowStockSql, lowParams);

    let expirySql = `
      SELECT
        b.branch_id,
        b.branch_name,
        p.product_name,
        p.brand,
        ba.batch_id,
        ba.batch_number,
        ba.expiry_date,
        i.quantity,
        i.loose_quantity,
        DATEDIFF(ba.expiry_date, CURDATE()) AS days_to_expiry
      FROM inventory i
      JOIN batches ba ON ba.batch_id = i.batch_id AND ba.branch_id = i.branch_id
      JOIN products p ON p.product_id = ba.product_id
      JOIN branches b ON b.branch_id = i.branch_id
      WHERE ba.expiry_date IS NOT NULL
        AND ba.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND (i.quantity > 0 OR i.loose_quantity > 0)
    `;
    const expiryParams = [EXPIRY_DAYS];

    if (branchFilter) {
      expirySql += " AND i.branch_id = ?";
      expiryParams.push(branchFilter);
    }

    expirySql += " ORDER BY ba.expiry_date ASC LIMIT 100";

    const [expiryAlerts] = await pool.query(expirySql, expiryParams);

    res.json({
      success: true,
      thresholds: {
        lowStockSmallestUnits: LOW_STOCK_UNITS,
        expiryAlertDays: EXPIRY_DAYS,
      },
      lowStock,
      expiryAlerts,
    });
  } catch (error) {
    console.error("Alerts error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load alerts." });
  }
});

module.exports = router;
