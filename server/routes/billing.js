const express = require("express");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { requireShopUser } = require("../middleware/requireShopUser");
const {
  getBatchStock,
  availableSmallestUnits,
  setStockUnits,
  recordStockMovement,
  resolveBranchId,
} = require("../lib/stockHelpers");

const router = express.Router();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/billing/medicines?search=...
// Search medicines and their available batches for billing.
router.get("/medicines", authenticateToken, async (req, res) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    if (search.length < 2) {
      return res.json({
        success: true,
        count: 0,
        medicines: [],
      });
    }



    const branchId = req.user.branchId;

    // Admin must explicitly select a branch.
    const requestedBranchId =
      typeof req.query.branchId === "string"
        ? req.query.branchId.trim()
        : "";

    let effectiveBranchId;

    if (req.user.role === "SHOP_USER") {
      effectiveBranchId = branchId;
    } else if (req.user.role === "ADMIN") {
      effectiveBranchId = requestedBranchId;
    }

    if (!effectiveBranchId) {
      return res.status(400).json({
        success: false,
        message: "A branch must be selected for billing.",
      });
    }

    const searchTerm = `%${search}%`;

    const sql = `
      SELECT
        b.branch_id,
        b.branch_name,
        p.product_id,
        p.product_name,
        p.brand,
        s.salt_name,
        p.strength,
        p.dosage_form,
        p.packaging,
        p.stock_unit_label,
        p.smallest_unit_label,
        p.units_per_stock_unit,
        bp.rack_id,
        r.rack_code,
        ba.batch_id,
        ba.batch_number,
        ba.expiry_date,
        ba.mrp,
        ba.purchase_price,
        i.quantity AS stock_quantity,
        i.loose_quantity,
        i.selling_price,
        (
          i.quantity * COALESCE(p.units_per_stock_unit, 1)
          + i.loose_quantity
        ) AS available_smallest_units
      FROM inventory i
      JOIN batches ba
        ON ba.batch_id = i.batch_id
       AND ba.branch_id = i.branch_id
      JOIN products p
        ON p.product_id = ba.product_id
      JOIN branches b
        ON b.branch_id = i.branch_id
      JOIN branch_products bp
        ON bp.branch_id = i.branch_id
       AND bp.product_id = p.product_id
      LEFT JOIN salts s
        ON s.salt_id = p.salt_id
      LEFT JOIN racks r
        ON r.rack_id = bp.rack_id
       AND r.branch_id = bp.branch_id
      WHERE i.branch_id = ?
        AND p.is_active = TRUE
        AND (ba.expiry_date IS NULL OR ba.expiry_date >= CURDATE())
        AND (
          p.product_name LIKE ?
          OR p.brand LIKE ?
          OR s.salt_name LIKE ?
          OR ba.batch_number LIKE ?
        )
        AND (
          i.quantity > 0
          OR i.loose_quantity > 0
        )
      ORDER BY
        (ba.expiry_date IS NULL) ASC,
        ba.expiry_date ASC,
        p.product_name ASC
      LIMIT 100
    `;

    const [medicines] = await pool.execute(sql, [
      effectiveBranchId,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
    ]);

    return res.json({
      success: true,
      count: medicines.length,
      medicines,
    });
  } catch (error) {
    console.error("Billing medicine search error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to search billing inventory.",
    });
  }
});

function parsePatientNotes(notes) {
  if (!notes || typeof notes !== "string") return null;
  const pick = (re) => {
    const m = notes.match(re);
    if (!m) return "";
    const v = m[1].trim();
    return v === "N/A" ? "" : v;
  };
  const name = pick(/Patient:\s*([^|]+)/i);
  if (!name) return null;
  return {
    name,
    age: pick(/Age:\s*([^|]+)/i),
    mobile: pick(/Mobile:\s*([^|]+)/i),
    gender: pick(/Gender:\s*([^|]+)/i),
    doctorName: pick(/Doctor:\s*([^|]+)/i),
  };
}

router.get(
  "/patients/search",
  authenticateToken,
  requireShopUser,
  async (req, res) => {
    try {
      const branchId = resolveBranchId(req.user);
      const query =
        typeof req.query.q === "string" ? req.query.q.trim() : "";

      if (query.length < 1) {
        return res.json({ success: true, patients: [] });
      }

      const term = `%${query}%`;
      const seen = new Set();
      const patients = [];

      function addPatient(entry) {
        const key = `${(entry.mobile || "").replace(/\s/g, "")}|${entry.name.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        patients.push(entry);
      }

      const [rows] = await pool.execute(
        `SELECT p.patient_id, p.full_name, p.mobile,
                (
                  SELECT s.notes
                  FROM sales s
                  WHERE s.branch_id = p.branch_id
                    AND s.patient_id = p.patient_id
                    AND s.notes IS NOT NULL
                  ORDER BY s.sale_datetime DESC
                  LIMIT 1
                ) AS latest_notes
         FROM patients p
         WHERE p.branch_id = ?
           AND (p.full_name LIKE ? OR COALESCE(p.mobile, '') LIKE ?)
         ORDER BY p.full_name ASC
         LIMIT 12`,
        [branchId, term, term]
      );

      for (const row of rows) {
        const fromNotes = parsePatientNotes(row.latest_notes);
        addPatient({
          patientId: row.patient_id,
          name: row.full_name,
          mobile: row.mobile || fromNotes?.mobile || "",
          age: fromNotes?.age || "",
          gender: fromNotes?.gender || "",
          doctorName: fromNotes?.doctorName || "",
          source: "patient",
        });
      }

      const [noteSales] = await pool.execute(
        `SELECT notes
         FROM sales
         WHERE branch_id = ?
           AND sale_type = 'BILLED'
           AND notes IS NOT NULL
           AND notes LIKE ?
         ORDER BY sale_datetime DESC
         LIMIT 25`,
        [branchId, term]
      );

      for (const row of noteSales) {
        const parsed = parsePatientNotes(row.notes);
        if (!parsed) continue;
        if (
          !parsed.name.toLowerCase().includes(query.toLowerCase()) &&
          !(parsed.mobile || "").includes(query)
        ) {
          continue;
        }
        addPatient({
          patientId: null,
          name: parsed.name,
          mobile: parsed.mobile,
          age: parsed.age,
          gender: parsed.gender,
          doctorName: parsed.doctorName,
          source: "bill",
        });
        if (patients.length >= 15) break;
      }

      res.json({ success: true, patients: patients.slice(0, 15) });
    } catch (error) {
      console.error("Patient search error:", error.message);
      res.status(500).json({
        success: false,
        message: "Unable to search patients.",
      });
    }
  }
);

router.get("/history", authenticateToken, requireShopUser, async (req, res) => {
  try {
    const branchId = resolveBranchId(req.user);
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch context is required.",
      });
    }

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    let sql = `
      SELECT
        s.sale_id,
        s.invoice_number,
        s.sale_type,
        s.grand_total,
        s.subtotal,
        s.discount_total,
        s.sale_datetime,
        s.payment_method,
        s.notes,
        p.full_name AS patient_full_name,
        p.mobile AS patient_mobile_db
      FROM sales s
      LEFT JOIN patients p
        ON p.patient_id = s.patient_id
       AND p.branch_id = s.branch_id
      WHERE s.branch_id = ?
        AND s.status = 'FINALIZED'
        AND s.sale_type = 'BILLED'
    `;
    const params = [branchId];

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

    sql += ` ORDER BY s.sale_datetime DESC LIMIT 100`;

    const [sales] = await pool.execute(sql, params);

    const enriched = sales.map((row) => {
      const notes = row.notes || "";
      const nameMatch = notes.match(/Patient:\s*([^|]+)/i);
      const mobileMatch = notes.match(/Mobile:\s*([^|]+)/i);
      const mobileFromNotes =
        mobileMatch && mobileMatch[1].trim() !== "N/A"
          ? mobileMatch[1].trim()
          : null;

      return {
        sale_id: row.sale_id,
        invoice_number: row.invoice_number,
        sale_type: row.sale_type,
        grand_total: row.grand_total,
        subtotal: row.subtotal,
        discount_total: row.discount_total,
        sale_datetime: row.sale_datetime,
        payment_method: row.payment_method,
        notes: row.notes,
        patientName:
          row.patient_full_name ||
          (nameMatch ? nameMatch[1].trim() : null),
        patientMobile: row.patient_mobile_db || mobileFromNotes,
      };
    });

    res.json({ success: true, sales: enriched, count: enriched.length });
  } catch (error) {
    console.error("Bill history error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load bill history." });
  }
});

router.get("/recent", authenticateToken, requireShopUser, async (req, res) => {
  try {
    const branchId = resolveBranchId(req.user);
    const [sales] = await pool.execute(
      `SELECT sale_id, invoice_number, sale_type, grand_total, sale_datetime, payment_method
       FROM sales
       WHERE branch_id = ? AND status = 'FINALIZED' AND sale_type = 'BILLED'
       ORDER BY sale_datetime DESC
       LIMIT 50`,
      [branchId]
    );
    res.json({ success: true, sales });
  } catch (error) {
    console.error("Recent bills error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load recent bills." });
  }
});

router.get("/:saleId", authenticateToken, requireShopUser, async (req, res) => {
  try {
    const branchId = resolveBranchId(req.user);
    const saleId = Number(req.params.saleId);
    if (!Number.isSafeInteger(saleId)) {
      return res.status(400).json({ success: false, message: "Invalid sale ID." });
    }

    const [sales] = await pool.execute(
      `SELECT * FROM sales WHERE sale_id = ? AND branch_id = ?`,
      [saleId, branchId]
    );
    if (!sales.length) {
      return res.status(404).json({ success: false, message: "Bill not found." });
    }

    const [items] = await pool.execute(
      `SELECT * FROM sale_items WHERE sale_id = ? AND branch_id = ?`,
      [saleId, branchId]
    );

    res.json({ success: true, sale: sales[0], items });
  } catch (error) {
    console.error("Get bill error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load bill." });
  }
});

router.post("/unbilled", authenticateToken, requireShopUser, async (req, res) => {
  const connection = await pool.getConnection();
  let started = false;

  try {
    const branchId = resolveBranchId(req.user);
    const {
      clientTransactionId,
      paymentMethod = "NOT_RECORDED",
      notes = "",
      billDiscount = 0,
      items,
    } = req.body || {};

    if (!UUID_RE.test(clientTransactionId || "") || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: "clientTransactionId and items are required.",
      });
    }

    const billDiscountAmount = Math.max(0, Number(billDiscount) || 0);

    await connection.beginTransaction();
    started = true;

    const [existing] = await connection.execute(
      `SELECT sale_id FROM sales WHERE client_transaction_id = ? FOR UPDATE`,
      [clientTransactionId]
    );
    if (existing.length) {
      await connection.rollback();
      started = false;
      return res.json({ success: true, duplicate: true, saleId: existing[0].sale_id });
    }

    let subtotal = 0;
    let itemDiscountTotal = 0;
    const calculatedItems = [];

    for (const item of items) {
      const batchId = Number(item.batchId);
      const quantity = Number(item.quantity);
      const gstRate = Number(item.gstRate ?? 5);
      const discountAmount = Math.max(0, Number(item.discountAmount ?? 0));
      if (!Number.isSafeInteger(batchId) || quantity <= 0) {
        throw new Error("Invalid batch or quantity.");
      }

      const stock = await getBatchStock(connection, branchId, batchId, true);
      if (!stock) throw new Error(`Batch ${batchId} unavailable.`);

      const packSize = Number(stock.units_per_stock_unit || 1);
      const available = availableSmallestUnits(stock);
      if (quantity > available) {
        throw new Error(`Insufficient stock for ${stock.product_name}.`);
      }

      const unitPrice = Number(stock.selling_price) / packSize;
      const lineGross = Number((unitPrice * quantity).toFixed(2));
      if (discountAmount > lineGross) {
        throw new Error(`Discount exceeds line amount for ${stock.product_name}.`);
      }
      const lineTotal = Number((lineGross - discountAmount).toFixed(2));

      subtotal += lineGross;
      itemDiscountTotal += discountAmount;

      calculatedItems.push({
        stock,
        quantity,
        packSize,
        unitPrice,
        gstRate,
        discountAmount,
        lineTotal,
      });
    }

    const grandTotal = Math.max(
      0,
      Number((subtotal - itemDiscountTotal - billDiscountAmount).toFixed(2))
    );

    const [saleResult] = await connection.execute(
      `INSERT INTO sales (
         branch_id, patient_id, doctor_id, sale_type, status, invoice_number,
         client_transaction_id, sale_datetime, payment_method,
         subtotal, discount_total, taxable_total, cgst_total, sgst_total, igst_total,
         grand_total, notes, created_by
       ) VALUES (?, NULL, NULL, 'UNBILLED', 'FINALIZED', NULL, ?, NOW(3), ?, ?, ?, 0, 0, 0, 0, ?, ?, ?)`,
      [
        branchId,
        clientTransactionId,
        paymentMethod,
        Number(subtotal.toFixed(2)),
        Number((itemDiscountTotal + billDiscountAmount).toFixed(2)),
        grandTotal,
        String(notes).trim(),
        req.user.userId,
      ]
    );

    const saleId = saleResult.insertId;

    for (const line of calculatedItems) {
      const { stock, quantity, unitPrice, gstRate, discountAmount, lineTotal } = line;
      await connection.execute(
        `INSERT INTO sale_items (
           sale_id, branch_id, batch_id, product_name_snapshot, batch_number_snapshot,
           expiry_date_snapshot, quantity, mrp, unit_selling_price, discount_amount,
           hsn_code, gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, line_total
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, 0, 0, ?)`,
        [
          saleId,
          branchId,
          stock.batch_id,
          stock.product_name,
          stock.batch_number,
          stock.expiry_date,
          quantity,
          stock.mrp,
          Number(unitPrice.toFixed(2)),
          discountAmount,
          gstRate,
          lineTotal,
        ]
      );

      const fresh = await getBatchStock(connection, branchId, stock.batch_id, true);
      const remaining = availableSmallestUnits(fresh) - quantity;
      await setStockUnits(connection, branchId, stock.batch_id, remaining);

      await recordStockMovement(connection, {
        branchId,
        batchId: stock.batch_id,
        quantityDelta: -quantity,
        transactionType: "SALE",
        sourceType: "UNBILLED_SALE",
        sourceKey: `UNBILLED-${saleId}`,
        notes: notes || "Unbilled sale",
        userId: req.user.userId,
      });
    }

    await connection.commit();
    started = false;

    res.status(201).json({
      success: true,
      saleId,
      saleType: "UNBILLED",
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number((itemDiscountTotal + billDiscountAmount).toFixed(2)),
      grandTotal,
      message: "Unbilled sale recorded.",
    });
  } catch (error) {
    if (started) await connection.rollback();
    console.error("Unbilled sale error:", error);
    res.status(/Insufficient|Invalid|unavailable/i.test(error.message) ? 400 : 500).json({
      success: false,
      message: error.message || "Unbilled sale failed.",
    });
  } finally {
    connection.release();
  }
});

router.put("/:saleId", authenticateToken, requireShopUser, async (req, res) => {
  const connection = await pool.getConnection();
  let started = false;

  try {
    const branchId = resolveBranchId(req.user);
    const saleId = Number(req.params.saleId);
    const { paymentMethod, items, notes } = req.body || {};

    if (!Number.isSafeInteger(saleId) || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: "Valid saleId and items are required.",
      });
    }

    await connection.beginTransaction();
    started = true;

    const [sales] = await connection.execute(
      `SELECT sale_id, sale_type, status FROM sales
       WHERE sale_id = ? AND branch_id = ? FOR UPDATE`,
      [saleId, branchId]
    );
    if (!sales.length || sales[0].status !== "FINALIZED" || sales[0].sale_type !== "BILLED") {
      throw new Error("Only finalized billed sales can be edited.");
    }

    const [oldItems] = await connection.execute(
      `SELECT sale_item_id, batch_id, quantity, product_name_snapshot
       FROM sale_items
       WHERE sale_id = ? AND branch_id = ?`,
      [saleId, branchId]
    );

    const [returnRows] = await connection.execute(
      `SELECT cri.sale_item_id, SUM(cri.quantity) AS returned_qty
       FROM customer_return_items cri
       INNER JOIN sale_items si ON si.sale_item_id = cri.sale_item_id
       WHERE si.sale_id = ? AND si.branch_id = ?
       GROUP BY cri.sale_item_id`,
      [saleId, branchId]
    );

    const returnedBySaleItem = new Map(
      returnRows.map((row) => [
        row.sale_item_id,
        Number(row.returned_qty) || 0,
      ])
    );

    const newLines = items.map((item) => ({
      batchId: Number(item.batchId),
      quantity: Number(item.quantity),
      discount: Number(item.discountAmount ?? 0),
      gstRate: Number(item.gstRate ?? 5),
    }));

    const batchCounts = new Map();
    for (const line of newLines) {
      batchCounts.set(line.batchId, (batchCounts.get(line.batchId) || 0) + 1);
    }
    for (const [, count] of batchCounts) {
      if (count > 1) {
        throw new Error("Each batch can appear only once on a bill.");
      }
    }

    const newByBatch = new Map(newLines.map((line) => [line.batchId, line]));

    for (const old of oldItems) {
      const returned = returnedBySaleItem.get(old.sale_item_id) || 0;
      const updated = newByBatch.get(old.batch_id);

      if (!updated) {
        if (returned > 0) {
          throw new Error(
            `Cannot remove "${old.product_name_snapshot}" — ${returned} unit(s) were already returned by the customer.`
          );
        }
        continue;
      }

      if (returned > 0 && updated.quantity < returned) {
        throw new Error(
          `"${old.product_name_snapshot}" quantity cannot be less than ${returned} (already returned).`
        );
      }
    }

    for (const old of oldItems) {
      const stock = await getBatchStock(connection, branchId, old.batch_id, true);
      if (stock) {
        const restored = availableSmallestUnits(stock) + Number(old.quantity);
        await setStockUnits(connection, branchId, old.batch_id, restored);
      }
      await recordStockMovement(connection, {
        branchId,
        batchId: old.batch_id,
        quantityDelta: Number(old.quantity),
        transactionType: "SALE_EDIT",
        sourceType: "SALE_EDIT",
        sourceKey: `EDIT-RESTORE-${saleId}`,
        notes: "Edit bill — restore previous lines",
        userId: req.user.userId,
      });
    }

    let subtotal = 0;
    let discountTotal = 0;
    let grandTotal = 0;

    for (const old of oldItems) {
      const updated = newByBatch.get(old.batch_id);
      if (!updated) {
        const returned = returnedBySaleItem.get(old.sale_item_id) || 0;
        if (returned === 0) {
          await connection.execute(
            `DELETE FROM sale_items WHERE sale_item_id = ? AND branch_id = ?`,
            [old.sale_item_id, branchId]
          );
        }
        continue;
      }

      newByBatch.delete(old.batch_id);

      const { batchId, quantity, discount, gstRate } = updated;
      const stock = await getBatchStock(connection, branchId, batchId, true);
      if (!stock) throw new Error(`Batch ${batchId} unavailable.`);

      const packSize = Number(stock.units_per_stock_unit || 1);
      const available = availableSmallestUnits(stock);
      if (quantity > available) {
        throw new Error(`Insufficient stock for ${stock.product_name}.`);
      }

      const unitPrice = Number(stock.selling_price) / packSize;
      const lineGross = Number((unitPrice * quantity).toFixed(2));
      if (discount > lineGross) throw new Error("Discount exceeds line amount.");

      const lineTotal = Number((lineGross - discount).toFixed(2));
      subtotal += lineGross;
      discountTotal += discount;
      grandTotal += lineTotal;

      await connection.execute(
        `UPDATE sale_items SET
           batch_id = ?,
           product_name_snapshot = ?,
           batch_number_snapshot = ?,
           expiry_date_snapshot = ?,
           quantity = ?,
           mrp = ?,
           unit_selling_price = ?,
           discount_amount = ?,
           gst_rate = ?,
           taxable_amount = 0,
           cgst_amount = 0,
           sgst_amount = 0,
           igst_amount = 0,
           line_total = ?
         WHERE sale_item_id = ? AND branch_id = ?`,
        [
          stock.batch_id,
          stock.product_name,
          stock.batch_number,
          stock.expiry_date,
          quantity,
          stock.mrp,
          Number(unitPrice.toFixed(2)),
          discount,
          gstRate,
          lineTotal,
          old.sale_item_id,
          branchId,
        ]
      );

      await setStockUnits(connection, branchId, batchId, available - quantity);
      await recordStockMovement(connection, {
        branchId,
        batchId,
        quantityDelta: -quantity,
        transactionType: "SALE_EDIT",
        sourceType: "SALE_EDIT",
        sourceKey: `EDIT-${saleId}`,
        notes: "Edit bill — updated line",
        userId: req.user.userId,
      });
    }

    for (const [, line] of newByBatch) {
      const { batchId, quantity, discount, gstRate } = line;
      const stock = await getBatchStock(connection, branchId, batchId, true);
      if (!stock) throw new Error(`Batch ${batchId} unavailable.`);

      const packSize = Number(stock.units_per_stock_unit || 1);
      const available = availableSmallestUnits(stock);
      if (quantity > available) {
        throw new Error(`Insufficient stock for ${stock.product_name}.`);
      }

      const unitPrice = Number(stock.selling_price) / packSize;
      const lineGross = Number((unitPrice * quantity).toFixed(2));
      if (discount > lineGross) throw new Error("Discount exceeds line amount.");

      const lineTotal = Number((lineGross - discount).toFixed(2));
      subtotal += lineGross;
      discountTotal += discount;
      grandTotal += lineTotal;

      await connection.execute(
        `INSERT INTO sale_items (
           sale_id, branch_id, batch_id, product_name_snapshot, batch_number_snapshot,
           expiry_date_snapshot, quantity, mrp, unit_selling_price, discount_amount,
           hsn_code, gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, line_total
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, 0, 0, ?)`,
        [
          saleId,
          branchId,
          stock.batch_id,
          stock.product_name,
          stock.batch_number,
          stock.expiry_date,
          quantity,
          stock.mrp,
          Number(unitPrice.toFixed(2)),
          discount,
          gstRate,
          lineTotal,
        ]
      );

      await setStockUnits(connection, branchId, batchId, available - quantity);
      await recordStockMovement(connection, {
        branchId,
        batchId,
        quantityDelta: -quantity,
        transactionType: "SALE_EDIT",
        sourceType: "SALE_EDIT",
        sourceKey: `EDIT-${saleId}`,
        notes: "Edit bill — new line",
        userId: req.user.userId,
      });
    }

    await connection.execute(
      `UPDATE sales SET
         payment_method = COALESCE(?, payment_method),
         subtotal = ?,
         discount_total = ?,
         grand_total = ?,
         notes = COALESCE(?, notes)
       WHERE sale_id = ? AND branch_id = ?`,
      [
        paymentMethod || null,
        Number(subtotal.toFixed(2)),
        Number(discountTotal.toFixed(2)),
        Number(grandTotal.toFixed(2)),
        notes != null ? String(notes) : null,
        saleId,
        branchId,
      ]
    );

    await connection.commit();
    started = false;

    res.json({
      success: true,
      saleId,
      grandTotal: Number(grandTotal.toFixed(2)),
      message: "Bill updated and stock adjusted.",
    });
  } catch (error) {
    if (started) await connection.rollback();
    console.error("Edit bill error:", error);

    let message = error.message || "Bill edit failed.";
    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
      message =
        "This bill has customer returns linked to its line items. You cannot delete those lines — adjust quantities or add new lines only.";
    }

    res.status(
      /Insufficient|Only finalized|Discount|unavailable|Cannot remove|cannot be less|Duplicate batch/i.test(
        message
      )
        ? 400
        : 500
    ).json({
      success: false,
      message,
    });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/billing
 *
 * Body:
 * {
 *   "branchId": 1,                 // required for ADMIN
 *   "clientTransactionId": "UUID",
 *   "patientId": null,
 *   "doctorId": null,
 *   "paymentMethod": "CASH",
 *   "items": [
 *     {
 *       "batchId": 1,
 *       "quantity": 13,             // smallest units: e.g. tablets
 *       "discountAmount": 0,
 *       "gstRate": 5
 *     }
 *   ]
 * }
 */
router.post("/", authenticateToken, requireShopUser, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      branchId: requestedBranchId,
      clientTransactionId,
      patientId = null,
      doctorId = null,
      paymentMethod = "CASH",
      notes = "",
      patientName = "",
      patientMobile = "",
      billDiscount = 0,
      items,
    } = req.body;

    const branchId =
      req.user.role === "SHOP_USER"
        ? req.user.branchId
        : requestedBranchId;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "Select a branch before billing.",
      });
    }

    const extraBillDiscount = Math.max(0, Number(billDiscount) || 0);

    if (
      typeof clientTransactionId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientTransactionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid clientTransactionId UUID is required.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Add between 1 and 100 medicine items.",
      });
    }

    const allowedPayments = [
      "CASH",
      "UPI",
      "CARD",
      "OTHER",
      "NOT_RECORDED",
    ];

    if (!allowedPayments.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    // Validate all item inputs before opening the transaction.
    for (const item of items) {
      if (
        !Number.isSafeInteger(Number(item.batchId)) ||
        Number(item.batchId) <= 0 ||
        !Number.isSafeInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item needs a valid batchId and positive whole-unit quantity.",
        });
      }

      const discount = Number(item.discountAmount ?? 0);
      const gstRate = Number(item.gstRate);

      if (
        !Number.isFinite(discount) ||
        discount < 0 ||
        !Number.isFinite(gstRate) ||
        gstRate < 0 ||
        gstRate > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount or GST rate.",
        });
      }
    }

    await connection.beginTransaction();

    // Idempotency: the same client transaction must not create a second bill.
    const [existing] = await connection.execute(
      `SELECT sale_id, branch_id, invoice_number, grand_total, status
       FROM sales
       WHERE client_transaction_id = ?
       LIMIT 1
       FOR UPDATE`,
      [clientTransactionId]
    );

    if (existing.length) {
      await connection.rollback();

      if (Number(existing[0].branch_id) !== Number(branchId)) {
        return res.status(409).json({
          success: false,
          message: "This transaction ID is already used by another branch.",
        });
      }

      return res.json({
        success: true,
        duplicate: true,
        sale: existing[0],
      });
    }

    const calculatedItems = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let grandTotal = 0;

    for (const item of items) {
      // Lock the selected branch's batch stock to prevent overselling.
      const [rows] = await connection.execute(
        `SELECT
           i.branch_id,
           i.batch_id,
           i.quantity,
           i.loose_quantity,
           i.selling_price,
           p.product_id,
           p.product_name,
           p.units_per_stock_unit,
           p.stock_unit_label,
           p.smallest_unit_label,
           ba.batch_number,
           ba.expiry_date,
           ba.mrp,
           ba.purchase_price
         FROM inventory i
         JOIN batches ba
           ON ba.batch_id = i.batch_id
          AND ba.branch_id = i.branch_id
         JOIN products p
           ON p.product_id = ba.product_id
         WHERE i.branch_id = ?
           AND i.batch_id = ?
           AND p.is_active = TRUE
           AND (ba.expiry_date IS NULL OR ba.expiry_date >= CURDATE())
         FOR UPDATE`,
        [branchId, item.batchId]
      );

      if (!rows.length) {
        throw new Error(
          `Batch ${item.batchId} is unavailable, expired, or not in the selected branch.`
        );
      }

      const stock = rows[0];
      const packSize = Number(stock.units_per_stock_unit || 1);
      const requestedUnits = Number(item.quantity);
      const availableUnits =
        Number(stock.quantity) * packSize +
        Number(stock.loose_quantity || 0);

      if (requestedUnits > availableUnits) {
        throw new Error(
          `Insufficient stock for ${stock.product_name}. Available: ${availableUnits} ${stock.smallest_unit_label || "units"}.`
        );
      }

      // inventory.selling_price is the GST-inclusive price per complete pack.
      const unitPrice = Number(stock.selling_price) / packSize;
      const lineGross = Number((unitPrice * requestedUnits).toFixed(2));
      const discount = Number(
        Number(item.discountAmount ?? 0).toFixed(2)
      );

      if (discount > lineGross) {
        throw new Error(
          `Discount cannot exceed the amount for ${stock.product_name}.`
        );
      }

      const gstRate = Number(item.gstRate);
      const afterDiscount = Number((lineGross - discount).toFixed(2));

      // Selling price already includes GST; extract it rather than adding it again.
      const taxable = Number(
        (afterDiscount / (1 + gstRate / 100)).toFixed(2)
      );
      const tax = Number((afterDiscount - taxable).toFixed(2));
      const cgst = Number((tax / 2).toFixed(2));
      const sgst = Number((tax - cgst).toFixed(2));

      calculatedItems.push({
        stock,
        requestedUnits,
        packSize,
        lineGross,
        discount,
        gstRate,
        taxable,
        cgst,
        sgst,
        lineTotal: afterDiscount,
        unitPrice,
      });

      subtotal += lineGross;
      discountTotal += discount;
      taxableTotal += taxable;
      cgstTotal += cgst;
      sgstTotal += sgst;
      grandTotal += afterDiscount;
    }

    if (extraBillDiscount > 0) {
      discountTotal += extraBillDiscount;
      grandTotal = Math.max(
        0,
        Number((grandTotal - extraBillDiscount).toFixed(2))
      );
    }

    const saleNotes =
      typeof notes === "string" && notes.trim() ? notes.trim() : null;

    let effectivePatientId =
      patientId != null && patientId !== "" ? Number(patientId) : null;

    const trimmedPatientName =
      typeof patientName === "string" ? patientName.trim() : "";
    const trimmedPatientMobile =
      typeof patientMobile === "string" ? patientMobile.trim() : "";

    if (!effectivePatientId && trimmedPatientName) {
      if (trimmedPatientMobile) {
        const [byMobile] = await connection.execute(
          `SELECT patient_id FROM patients
           WHERE branch_id = ? AND mobile = ?
           LIMIT 1`,
          [branchId, trimmedPatientMobile]
        );
        if (byMobile.length) {
          effectivePatientId = byMobile[0].patient_id;
        }
      }

      if (!effectivePatientId) {
        const [byName] = await connection.execute(
          `SELECT patient_id FROM patients
           WHERE branch_id = ? AND full_name = ?
           LIMIT 1`,
          [branchId, trimmedPatientName]
        );
        if (byName.length) {
          effectivePatientId = byName[0].patient_id;
        }
      }

      if (!effectivePatientId) {
        const [created] = await connection.execute(
          `INSERT INTO patients (branch_id, full_name, mobile)
           VALUES (?, ?, ?)`,
          [
            branchId,
            trimmedPatientName,
            trimmedPatientMobile || null,
          ]
        );
        effectivePatientId = created.insertId;
      }
    }

    // Verify referenced patient/doctor belongs to this branch.
    // The schema uses composite branch foreign keys for these records.
    if (effectivePatientId !== null) {
      const [patients] = await connection.execute(
        `SELECT patient_id FROM patients
         WHERE patient_id = ? AND branch_id = ?`,
        [effectivePatientId, branchId]
      );

      if (!patients.length) {
        throw new Error("Patient not found in the selected branch.");
      }
    }

    if (doctorId !== null) {
      const [doctors] = await connection.execute(
        `SELECT doctor_id FROM doctors
         WHERE doctor_id = ? AND branch_id = ?`,
        [doctorId, branchId]
      );

      if (!doctors.length) {
        throw new Error("Doctor not found in the selected branch.");
      }
    }

    // Unique, human-readable invoice reference.
    // Replace with the project's invoice-sequence mechanism if one exists.
    const invoiceNumber =
      `KM-${branchId}-${Date.now()}-${clientTransactionId.slice(0, 8)}`;

     // Fetch branch details for the invoice header
const [branchRows] = await connection.execute(
  `SELECT branch_name, legal_name, address, phone, gstin, invoice_prefix
   FROM branches
   WHERE branch_id = ? AND is_active = 1
   LIMIT 1`,
  [branchId]
);

if (!branchRows.length) {
  throw new Error("Selected branch not found or inactive.");
}

const branch = branchRows[0];

    const [saleResult] = await connection.execute(
      `INSERT INTO sales (
         branch_id,
         patient_id,
         doctor_id,
         sale_type,
         status,
         invoice_number,
         client_transaction_id,
         sale_datetime,
         payment_method,
         subtotal,
         discount_total,
         taxable_total,
         cgst_total,
         sgst_total,
         igst_total,
         grand_total,
         notes,
         created_by
       ) VALUES (?, ?, ?, 'BILLED', 'FINALIZED', ?, ?, NOW(3), ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        branchId,
        effectivePatientId,
        doctorId,
        invoiceNumber,
        clientTransactionId,
        paymentMethod,
        Number(subtotal.toFixed(2)),
        Number(discountTotal.toFixed(2)),
        Number(taxableTotal.toFixed(2)),
        Number(cgstTotal.toFixed(2)),
        Number(sgstTotal.toFixed(2)),
        Number(grandTotal.toFixed(2)),
        saleNotes,
        req.user.userId,
      ]
    );

    for (const line of calculatedItems) {
      const { stock, requestedUnits, packSize } = line;

      await connection.execute(
        `INSERT INTO sale_items (
           sale_id,
           branch_id,
           batch_id,
           product_name_snapshot,
           batch_number_snapshot,
           expiry_date_snapshot,
           quantity,
           mrp,
           unit_selling_price,
           discount_amount,
           hsn_code,
           gst_rate,
           taxable_amount,
           cgst_amount,
           sgst_amount,
           igst_amount,
           line_total
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, ?)`,
        [
          saleResult.insertId,
          branchId,
          stock.batch_id,
          stock.product_name,
          stock.batch_number,
          stock.expiry_date,
          requestedUnits,
          stock.mrp,
          Number(line.unitPrice.toFixed(2)),
          line.discount,
          line.gstRate,
          line.taxable,
          line.cgst,
          line.sgst,
          line.lineTotal,
        ]
      );

      // Convert remaining stock back into full packs + loose units.
      const remainingUnits =
        Number(stock.quantity) * packSize +
        Number(stock.loose_quantity || 0) -
        requestedUnits;

      const newPackQuantity = Math.floor(remainingUnits / packSize);
      const newLooseQuantity = remainingUnits % packSize;

      await connection.execute(
        `UPDATE inventory
         SET quantity = ?, loose_quantity = ?
         WHERE branch_id = ? AND batch_id = ?`,
        [
          newPackQuantity,
          newLooseQuantity,
          branchId,
          stock.batch_id,
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Bill created successfully.",
      sale: {
  saleId: saleResult.insertId,
  branchId,
  branchName: branch.branch_name,
  legalName: branch.legal_name,
  address: branch.address,
  phone: branch.phone,
  gstin: branch.gstin,
  invoicePrefix: branch.invoice_prefix,
  invoiceNumber,
  clientTransactionId,
  subtotal: Number(subtotal.toFixed(2)),
  discountTotal: Number(discountTotal.toFixed(2)),
  taxableTotal: Number(taxableTotal.toFixed(2)),
  cgstTotal: Number(cgstTotal.toFixed(2)),
  sgstTotal: Number(sgstTotal.toFixed(2)),
  grandTotal: Number(grandTotal.toFixed(2)),
  paymentMethod,
},
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create bill error:", error);

    const clientError =
      /insufficient stock|unavailable|expired|discount|patient not found|doctor not found/i.test(
        error.message
      );

    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: clientError
        ? error.message
        : "Unable to create bill. No stock changes were saved.",
    });
  } finally {
    connection.release();
  }
});


module.exports = router;
