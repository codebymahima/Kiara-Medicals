const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { authenticateToken, allowRoles } = require("../middleware/auth");

const router = express.Router();

const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

router.use(authenticateToken, allowRoles("ADMIN"));

router.get("/overview", async (req, res) => {
  try {
    const [branchRows] = await pool.query(
      `SELECT branch_id, branch_code, branch_name, gstin, is_active
       FROM branches
       ORDER BY branch_id ASC`
    );

    const [salesByBranch] = await pool.query(
      `SELECT
         s.branch_id,
         b.branch_name,
         COUNT(*) AS sale_count,
         COALESCE(SUM(s.grand_total), 0) AS total_sales
       FROM sales s
       JOIN branches b ON b.branch_id = s.branch_id
       WHERE s.status = 'FINALIZED'
       GROUP BY s.branch_id, b.branch_name`
    );

    const [totals] = await pool.query(
      `SELECT
         COUNT(*) AS sale_count,
         COALESCE(SUM(grand_total), 0) AS total_sales
       FROM sales
       WHERE status = 'FINALIZED'`
    );

    const [productCount] = await pool.query(
      `SELECT COUNT(*) AS count FROM products WHERE is_active = TRUE`
    );

    res.json({
      success: true,
      branches: branchRows,
      salesByBranch,
      totals: totals[0] || { sale_count: 0, total_sales: 0 },
      activeProductCount: productCount[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Admin overview error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load overview.",
    });
  }
});

router.get("/branches", async (req, res) => {
  try {
    const [branches] = await pool.query(
      `SELECT
         branch_id,
         branch_code,
         branch_name,
         legal_name,
         address,
         phone,
         gstin,
         invoice_prefix,
         is_active,
         created_at
       FROM branches
       ORDER BY branch_id ASC`
    );

    res.json({ success: true, branches });
  } catch (error) {
    console.error("List branches error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to list branches.",
    });
  }
});

router.post("/branches", async (req, res) => {
  try {
    const {
      branchCode,
      branchName,
      legalName,
      address = "",
      phone = "",
      gstin,
      invoicePrefix = "KM",
    } = req.body || {};

    if (
      typeof branchCode !== "string" ||
      !branchCode.trim() ||
      typeof branchName !== "string" ||
      !branchName.trim() ||
      typeof legalName !== "string" ||
      !legalName.trim() ||
      typeof gstin !== "string" ||
      !GSTIN_PATTERN.test(gstin.trim().toUpperCase())
    ) {
      return res.status(400).json({
        success: false,
        message:
          "branchCode, branchName, legalName, and a valid 15-character GSTIN are required.",
      });
    }

    const normalizedGstin = gstin.trim().toUpperCase();
    const code = branchCode.trim().toUpperCase();

    const [existing] = await pool.execute(
      `SELECT branch_id FROM branches
       WHERE branch_code = ? OR gstin = ?`,
      [code, normalizedGstin]
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "Branch code or GSTIN already exists.",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO branches (
         branch_code, branch_name, legal_name, address, phone,
         gstin, invoice_prefix, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        code,
        branchName.trim(),
        legalName.trim(),
        String(address).trim(),
        String(phone).trim(),
        normalizedGstin,
        String(invoicePrefix).trim() || "KM",
      ]
    );

    await pool.execute(
      `INSERT INTO branch_products (branch_id, product_id, low_stock_threshold)
       SELECT ?, product_id, 5
       FROM products
       WHERE is_active = TRUE`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      branchId: result.insertId,
      message: "Branch created. Assign shop users to this branch.",
    });
  } catch (error) {
    console.error("Create branch error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to create branch.",
    });
  }
});

router.patch("/branches/:branchId", async (req, res) => {
  try {
    const branchId = Number(req.params.branchId);
    const {
      isActive,
      branchName,
      legalName,
      address,
      phone,
      invoicePrefix,
    } = req.body || {};

    if (!Number.isSafeInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const updates = [];
    const params = [];

    if (typeof isActive === "boolean") {
      updates.push("is_active = ?");
      params.push(isActive);
    }

    if (typeof branchName === "string" && branchName.trim()) {
      updates.push("branch_name = ?");
      params.push(branchName.trim());
    }

    if (typeof legalName === "string" && legalName.trim()) {
      updates.push("legal_name = ?");
      params.push(legalName.trim());
    }

    if (typeof address === "string") {
      updates.push("address = ?");
      params.push(address.trim());
    }

    if (typeof phone === "string") {
      updates.push("phone = ?");
      params.push(phone.trim());
    }

    if (typeof invoicePrefix === "string" && invoicePrefix.trim()) {
      updates.push("invoice_prefix = ?");
      params.push(invoicePrefix.trim().toUpperCase());
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update.",
      });
    }

    params.push(branchId);
    const [result] = await pool.execute(
      `UPDATE branches SET ${updates.join(", ")} WHERE branch_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    res.json({
      success: true,
      message: "Branch updated successfully.",
    });
  } catch (error) {
    console.error("Update branch error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to update branch.",
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.username,
         u.role,
         u.branch_id,
         u.is_active,
         u.last_login_at,
         b.branch_name,
         b.branch_code
       FROM users u
       LEFT JOIN branches b ON b.branch_id = u.branch_id
       ORDER BY u.user_id ASC`
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error("List users error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to list users.",
    });
  }
});

router.post("/users", async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      role,
      branchId = null,
    } = req.body || {};

    const allowedRoles = ["ADMIN", "SHOP_USER", "SHOP_MANAGER", "SHOP_WORKER"];
    const isShopRole = ["SHOP_USER", "SHOP_MANAGER", "SHOP_WORKER"].includes(role);

    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      password.length < 8 ||
      typeof fullName !== "string" ||
      !fullName.trim() ||
      !allowedRoles.includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "username, fullName, password (min 8 chars), and role (ADMIN, SHOP_MANAGER, SHOP_WORKER, or SHOP_USER) are required.",
      });
    }

    if (isShopRole) {
      if (!Number.isSafeInteger(Number(branchId)) || Number(branchId) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Shop staff (Managers, Workers, Users) must be assigned to an active branch.",
        });
      }

      const [branches] = await pool.execute(
        `SELECT branch_id FROM branches WHERE branch_id = ? AND is_active = TRUE`,
        [Number(branchId)]
      );

      if (!branches.length) {
        return res.status(400).json({
          success: false,
          message: "Selected branch is not active.",
        });
      }
    } else if (branchId != null) {
      return res.status(400).json({
        success: false,
        message: "Admin accounts must not be assigned to a branch.",
      });
    }

    const [existing] = await pool.execute(
      `SELECT user_id FROM users WHERE username = ?`,
      [username.trim()]
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users
         (branch_id, full_name, username, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [
        isShopRole ? Number(branchId) : null,
        fullName.trim(),
        username.trim(),
        passwordHash,
        role,
      ]
    );

    res.status(201).json({
      success: true,
      userId: result.insertId,
      message: "User created successfully.",
    });
  } catch (error) {
    console.error("Create user error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to create user.",
    });
  }
});

router.get("/sales", async (req, res) => {
  try {
    const branchId = req.query.branchId
      ? Number(req.query.branchId)
      : null;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    if (
      branchId != null &&
      (!Number.isSafeInteger(branchId) || branchId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid branchId.",
      });
    }

    let sql = `
      SELECT
        s.sale_id,
        s.branch_id,
        b.branch_name,
        s.invoice_number,
        s.sale_type,
        s.payment_method,
        s.grand_total,
        s.sale_datetime,
        s.status,
        s.notes,
        p.full_name AS patient_full_name,
        p.mobile AS patient_mobile_db
      FROM sales s
      JOIN branches b ON b.branch_id = s.branch_id
      LEFT JOIN patients p
        ON p.patient_id = s.patient_id
       AND p.branch_id = s.branch_id
      WHERE s.status = 'FINALIZED'
    `;
    const params = [];

    if (branchId != null) {
      sql += " AND s.branch_id = ?";
      params.push(branchId);
    }

    if (search.length >= 1) {
      sql += ` AND (
        COALESCE(s.notes, '') LIKE ?
        OR COALESCE(s.invoice_number, '') LIKE ?
        OR CAST(s.sale_id AS CHAR) LIKE ?
        OR COALESCE(p.full_name, '') LIKE ?
        OR COALESCE(p.mobile, '') LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += " ORDER BY s.sale_datetime DESC LIMIT 100";

    const [sales] = await pool.query(sql, params);

    const enriched = sales.map((row) => {
      const notes = row.notes || "";
      const nameMatch = notes.match(/Patient:\s*([^|]+)/i);
      const mobileMatch = notes.match(/Mobile:\s*([^|]+)/i);
      const mobileFromNotes =
        mobileMatch && mobileMatch[1].trim() !== "N/A"
          ? mobileMatch[1].trim()
          : null;

      const patientName =
        row.patient_full_name ||
        (nameMatch ? nameMatch[1].trim() : "Walk-in Patient");

      return {
        ...row,
        patient_name: patientName,
        patientName: patientName,
        patient_mobile: row.patient_mobile_db || mobileFromNotes,
        patientMobile: row.patient_mobile_db || mobileFromNotes,
      };
    });

    res.json({ success: true, sales: enriched });
  } catch (error) {
    console.error("Admin sales error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load sales.",
    });
  }
});

module.exports = router;
