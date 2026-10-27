
const express = require("express");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { requireShopUser } = require("../middleware/requireShopUser");
const { randomUUID } = require("crypto");

const router = express.Router();


// Medicine Master disabled: creating products is not permitted.
router.post("/", authenticateToken, (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Medicine Master is disabled. Products cannot be created.",
  });
});

router.post("/non-billed", authenticateToken, requireShopUser, async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const {
      branchId: requestedBranchId,
      clientTransactionId,
      paymentMethod = "CASH",
      items,
    } = req.body;

    const branchId =
      req.user.role === "SHOP_USER"
        ? req.user.branchId
        : requestedBranchId;

    if (!branchId || !Number.isSafeInteger(Number(branchId))) {
      return res.status(400).json({
        success: false,
        message: "A valid branch is required.",
      });
    }

    if (
      typeof clientTransactionId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientTransactionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid clientTransactionId UUID is required.",
      });
    }

    if (!["CASH", "UPI", "CARD"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be CASH, UPI, or CARD.",
      });
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Add between 1 and 100 items.",
      });
    }

    for (const item of items) {
      const gstRate = Number(item.gstRate);

      if (
        !Number.isSafeInteger(Number(item.batchId)) ||
        Number(item.batchId) <= 0 ||
        !Number.isSafeInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        !Number.isFinite(gstRate) ||
        gstRate < 0 ||
        gstRate > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item needs a valid batchId, quantity, and GST rate.",
        });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Prevent duplicate sale submissions.
    const [existing] = await connection.execute(
      `SELECT sale_id, branch_id, sale_type, invoice_number,
              grand_total, status
       FROM sales
       WHERE client_transaction_id = ?
       LIMIT 1
       FOR UPDATE`,
      [clientTransactionId]
    );

    if (existing.length) {
      await connection.rollback();
      transactionStarted = false;

      if (Number(existing[0].branch_id) !== Number(branchId)) {
        return res.status(409).json({
          success: false,
          message: "Transaction ID belongs to another branch.",
        });
      }

      return res.json({
        success: true,
        duplicate: true,
        sale: existing[0],
      });
    }

    let subtotal = 0;
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let discountTotal = 0;
    let grandTotal = 0;

    const calculatedItems = [];

    for (const item of items) {
      // Lock the selected branch's stock row.
      const [rows] = await connection.execute(
        `SELECT
           i.branch_id,
           i.batch_id,
           i.quantity,
           i.loose_quantity,
           i.selling_price,
           p.product_name,
           p.units_per_stock_unit,
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
        [branchId, Number(item.batchId)]
      );

      if (!rows.length) {
        throw new Error(
          `Batch ${item.batchId} is unavailable, expired, or not in this branch.`
        );
      }

      const stock = rows[0];
      const packSize = Number(stock.units_per_stock_unit || 1);
      const quantity = Number(item.quantity);

      const availableUnits =
        Number(stock.quantity) * packSize +
        Number(stock.loose_quantity || 0);

      if (quantity > availableUnits) {
        throw new Error(
          `Insufficient stock for ${stock.product_name}. Available: ${availableUnits} smallest units.`
        );
      }

      // Use the saved inventory selling price, not a client-supplied price.
      // This matches the existing billing route: price is GST-inclusive per pack.
      const unitPrice = Number(stock.selling_price) / packSize;
      const lineGross = Number((unitPrice * quantity).toFixed(2));
      const gstRate = Number(item.gstRate);

      const taxable = Number(
        (lineGross / (1 + gstRate / 100)).toFixed(2)
      );
      const tax = Number((lineGross - taxable).toFixed(2));
      const cgst = Number((tax / 2).toFixed(2));
      const sgst = Number((tax - cgst).toFixed(2));

      calculatedItems.push({
        stock,
        quantity,
        packSize,
        unitPrice,
        gstRate,
        taxable,
        cgst,
        sgst,
        lineTotal: lineGross,
      });

      subtotal += lineGross;
      taxableTotal += taxable;
      cgstTotal += cgst;
      sgstTotal += sgst;
      grandTotal += lineGross;
    }

    // Non-billed sale: no patient, doctor, or invoice number.
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
         created_by
       ) VALUES (
         ?, NULL, NULL, 'UNBILLED', 'FINALIZED', NULL, ?,
         NOW(3), ?, ?, 0, ?, ?, ?, 0, ?, ?
       )`,
      [
        branchId,
        clientTransactionId,
        paymentMethod,
        Number(subtotal.toFixed(2)),
        Number(taxableTotal.toFixed(2)),
        Number(cgstTotal.toFixed(2)),
        Number(sgstTotal.toFixed(2)),
        Number(grandTotal.toFixed(2)),
        req.user.userId,
      ]
    );

    for (const line of calculatedItems) {
      const { stock, quantity, packSize } = line;
      const saleId = saleResult.insertId;

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
           line_total,
           quantity_unit,
           base_quantity_units,
           conversion_factor_snapshot,
           stock_quantity_snapshot
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, 0, ?,
           'SMALLEST_UNIT', ?, ?, ?
         )`,
        [
          saleId,
          branchId,
          stock.batch_id,
          stock.product_name,
          stock.batch_number,
          stock.expiry_date,
          quantity,
          stock.mrp,
          Number(line.unitPrice.toFixed(2)),
          line.gstRate,
          line.taxable,
          line.cgst,
          line.sgst,
          line.lineTotal,
          quantity,
          packSize,
          quantity,
        ]
      );

      // Deduct stock while preserving pack + loose-unit representation.
      const remainingUnits =
        Number(stock.quantity) * packSize +
        Number(stock.loose_quantity || 0) -
        quantity;

      await connection.execute(
        `UPDATE inventory
         SET quantity = ?, loose_quantity = ?
         WHERE branch_id = ? AND batch_id = ?`,
        [
          Math.floor(remainingUnits / packSize),
          remainingUnits % packSize,
          branchId,
          stock.batch_id,
        ]
      );

      // Audit the stock movement. One unique key per line.
      await connection.execute(
        `INSERT INTO stock_transactions (
           branch_id,
           batch_id,
           transaction_type,
           quantity_delta,
           source_type,
           source_key,
           idempotency_key,
           notes,
           occurred_at,
           created_by
         ) VALUES (?, ?, 'SALE', ?, 'SALE', ?, ?, ?, NOW(3), ?)`,
        [
          branchId,
          stock.batch_id,
          -quantity,
          `NON-BILLED-${saleId}`,
          randomUUID(),
          "Non-billed counter sale",
          req.user.userId,
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      saleId: saleResult.insertId,
      saleType: "UNBILLED",
      invoiceNumber: null,
      grandTotal: Number(grandTotal.toFixed(2)),
      message: "Non-billed sale recorded and stock updated.",
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
    }

    console.error("Create non-billed sale error:", error);

    const clientError =
      /insufficient stock|unavailable|expired/i.test(error.message);

    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: clientError
        ? error.message
        : "Unable to record non-billed sale. No changes were saved.",
    });
  } finally {
    if (connection) connection.release();
  }
});


// GET /api/products
// Fetch products with their salt names
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { search = "", includeInactive = "false" } = req.query;

    const searchTerm = `%${search.trim()}%`;

    let sql = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand,
        p.salt_id,
        s.salt_name,
        p.strength,
        p.dosage_form,
        p.packaging,
        p.product_type,
        p.default_hsn_code,
        p.default_gst_rate,
        p.is_h1_or_restricted,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN salts s ON p.salt_id = s.salt_id
      WHERE (
        p.product_name LIKE ?
        OR p.brand LIKE ?
        OR s.salt_name LIKE ?
      )
    `;

    const params = [searchTerm, searchTerm, searchTerm];

    if (includeInactive !== "true") {
      sql += " AND p.is_active = TRUE";
    }

    sql += " ORDER BY p.product_name ASC LIMIT 100";

    const [products] = await pool.query(sql, params);

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Fetch products error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch products.",
    });
  }
});

module.exports = router;
