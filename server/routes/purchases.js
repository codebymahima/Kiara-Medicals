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

router.get("/suppliers", authenticateToken, requireShopUser, async (req, res) => {
  try {
    const branchId = resolveBranchId(req.user);
    const [rows] = await pool.execute(
      `SELECT supplier_id, supplier_name, phone, gstin, address
       FROM suppliers
       WHERE branch_id = ? AND is_active = TRUE
       ORDER BY supplier_name ASC`,
      [branchId]
    );
    res.json({ success: true, suppliers: rows });
  } catch (error) {
    console.error("List suppliers error:", error.message);
    res.status(500).json({ success: false, message: "Unable to list suppliers." });
  }
});

router.post("/suppliers", authenticateToken, requireShopUser, async (req, res) => {
  try {
    const branchId = resolveBranchId(req.user);
    const { supplierName, phone = "", gstin = "", address = "" } = req.body || {};
    if (typeof supplierName !== "string" || !supplierName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }
    const [result] = await pool.execute(
      `INSERT INTO suppliers (branch_id, supplier_name, phone, gstin, address)
       VALUES (?, ?, ?, ?, ?)`,
      [branchId, supplierName.trim(), String(phone).trim(), String(gstin).trim(), String(address).trim()]
    );
    res.status(201).json({
      success: true,
      supplierId: result.insertId,
    });
  } catch (error) {
    console.error("Create supplier error:", error.message);
    res.status(500).json({ success: false, message: "Unable to create supplier." });
  }
});

router.get("/", authenticateToken, requireShopUser, async (req, res) => {
  try {
    const branchId = resolveBranchId(req.user);
    const [purchases] = await pool.query(
      `SELECT
         p.purchase_id,
         p.supplier_invoice_number,
         p.purchase_datetime,
         p.payment_method,
         p.grand_total,
         p.status,
         s.supplier_name
       FROM purchases p
       JOIN suppliers s ON s.supplier_id = p.supplier_id
       WHERE p.branch_id = ?
       ORDER BY p.purchase_datetime DESC
       LIMIT 100`,
      [branchId]
    );
    res.json({ success: true, purchases });
  } catch (error) {
    console.error("Purchase history error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load purchases." });
  }
});

router.post("/", authenticateToken, requireShopUser, async (req, res) => {
  const connection = await pool.getConnection();
  let started = false;

  try {
    const branchId = resolveBranchId(req.user);
    const {
      supplierId,
      supplierInvoiceNumber,
      paymentMethod = "CASH",
      clientTransactionId,
      items,
      notes = "",
    } = req.body || {};

    if (
      !Number.isSafeInteger(Number(supplierId)) ||
      typeof supplierInvoiceNumber !== "string" ||
      !supplierInvoiceNumber.trim() ||
      !UUID_RE.test(clientTransactionId || "") ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "supplierId, invoice number, items, and clientTransactionId are required.",
      });
    }

    if (!["CASH", "CHEQUE"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be CASH or CHEQUE.",
      });
    }

    await connection.beginTransaction();
    started = true;

    const [dup] = await connection.execute(
      `SELECT purchase_id FROM purchases WHERE client_transaction_id = ? FOR UPDATE`,
      [clientTransactionId]
    );
    if (dup.length) {
      await connection.rollback();
      started = false;
      return res.json({ success: true, duplicate: true, purchaseId: dup[0].purchase_id });
    }

    const [supplierCheck] = await connection.execute(
      `SELECT supplier_id FROM suppliers WHERE supplier_id = ? AND branch_id = ? AND is_active = TRUE`,
      [Number(supplierId), branchId]
    );
    if (!supplierCheck.length) {
      throw new Error("Supplier not found for this branch.");
    }

    let grandTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const batchNumber = String(item.batchNumber || "").trim();
      const quantityPacks = Number(item.quantityPacks);
      const purchasePrice = Number(item.purchasePrice);
      const mrp = Number(item.mrp);
      const sellingPrice = Number(item.sellingPrice ?? mrp);
      const gstRate = Number(item.gstRate ?? 5);
      const expiryDate = item.expiryDate || null;

      if (
        !Number.isSafeInteger(productId) ||
        !batchNumber ||
        !Number.isFinite(quantityPacks) ||
        quantityPacks <= 0 ||
        !Number.isFinite(purchasePrice) ||
        !Number.isFinite(mrp)
      ) {
        throw new Error("Each line needs productId, batchNumber, quantities, and prices.");
      }

      const [productRows] = await connection.execute(
        `SELECT product_id, units_per_stock_unit, default_hsn_code
         FROM products WHERE product_id = ? AND is_active = TRUE`,
        [productId]
      );
      if (!productRows.length) throw new Error(`Product ${productId} not found.`);

      const packSize = Number(productRows[0].units_per_stock_unit || 1);
      const addUnits = quantityPacks * packSize;
      const lineTotal = Number((purchasePrice * quantityPacks).toFixed(2));
      grandTotal += lineTotal;

      let batchId;
      const [existingBatch] = await connection.execute(
        `SELECT batch_id FROM batches
         WHERE branch_id = ? AND product_id = ? AND batch_number = ?`,
        [branchId, productId, batchNumber]
      );

      if (existingBatch.length) {
        batchId = existingBatch[0].batch_id;
        await connection.execute(
          `UPDATE batches SET expiry_date = ?, mrp = ?, purchase_price = ?
           WHERE batch_id = ? AND branch_id = ?`,
          [expiryDate, mrp, purchasePrice, batchId, branchId]
        );
      } else {
        const [batchInsert] = await connection.execute(
          `INSERT INTO batches (branch_id, product_id, batch_number, expiry_date, mrp, purchase_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [branchId, productId, batchNumber, expiryDate, mrp, purchasePrice]
        );
        batchId = batchInsert.insertId;

        await connection.execute(
          `INSERT INTO inventory (branch_id, batch_id, quantity, loose_quantity, selling_price)
           VALUES (?, ?, 0, 0, ?)
           ON DUPLICATE KEY UPDATE selling_price = VALUES(selling_price)`,
          [branchId, batchId, sellingPrice]
        );

        await connection.execute(
          `INSERT IGNORE INTO branch_products (branch_id, product_id, low_stock_threshold)
           VALUES (?, ?, 10)`,
          [branchId, productId]
        );
      }

      const stock = await getBatchStock(connection, branchId, batchId, true);
      if (!stock) {
        await connection.execute(
          `INSERT INTO inventory (branch_id, batch_id, quantity, loose_quantity, selling_price)
           VALUES (?, ?, 0, 0, ?)`,
          [branchId, batchId, sellingPrice]
        );
      } else {
        await connection.execute(
          `UPDATE inventory SET selling_price = ? WHERE branch_id = ? AND batch_id = ?`,
          [sellingPrice, branchId, batchId]
        );
      }

      const current = await getBatchStock(connection, branchId, batchId, true);
      const newTotal = availableSmallestUnits(current) + addUnits;
      await setStockUnits(connection, branchId, batchId, newTotal);

      processedItems.push({
        productId,
        batchId,
        batchNumber,
        expiryDate,
        quantityPacks,
        addUnits,
        purchasePrice,
        mrp,
        sellingPrice,
        gstRate,
        hsnCode: productRows[0].default_hsn_code,
        lineTotal,
      });
    }

    const [purchaseResult] = await connection.execute(
      `INSERT INTO purchases (
         branch_id, supplier_id, supplier_invoice_number, purchase_datetime,
         payment_method, subtotal, discount_total, taxable_total, cgst_total, sgst_total,
         grand_total, status, client_transaction_id, notes, created_by
       ) VALUES (?, ?, ?, NOW(3), ?, ?, 0, 0, 0, 0, ?, 'FINALIZED', ?, ?, ?)`,
      [
        branchId,
        Number(supplierId),
        supplierInvoiceNumber.trim(),
        paymentMethod,
        Number(grandTotal.toFixed(2)),
        Number(grandTotal.toFixed(2)),
        clientTransactionId,
        String(notes).trim(),
        req.user.userId,
      ]
    );

    const purchaseId = purchaseResult.insertId;

    for (const line of processedItems) {
      await connection.execute(
        `INSERT INTO purchase_items (
           purchase_id, branch_id, product_id, batch_id, batch_number, expiry_date,
           quantity_packs, quantity_smallest_units, purchase_price, mrp, selling_price,
           hsn_code, gst_rate, line_total
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseId,
          branchId,
          line.productId,
          line.batchId,
          line.batchNumber,
          line.expiryDate,
          line.quantityPacks,
          line.addUnits,
          line.purchasePrice,
          line.mrp,
          line.sellingPrice,
          line.hsnCode,
          line.gstRate,
          line.lineTotal,
        ]
      );

      await recordStockMovement(connection, {
        branchId,
        batchId: line.batchId,
        quantityDelta: line.addUnits,
        transactionType: "PURCHASE",
        sourceType: "PURCHASE",
        sourceKey: `PUR-${purchaseId}`,
        notes: `Purchase ${supplierInvoiceNumber}`,
        userId: req.user.userId,
      });
    }

    await connection.commit();
    started = false;

    res.status(201).json({
      success: true,
      purchaseId,
      grandTotal: Number(grandTotal.toFixed(2)),
      message: "Purchase saved and stock updated.",
    });
  } catch (error) {
    if (started) await connection.rollback();
    console.error("Create purchase error:", error);
    const clientMsg = /not found|needs|Supplier/i.test(error.message);
    res.status(clientMsg ? 400 : 500).json({
      success: false,
      message: clientMsg ? error.message : "Purchase could not be saved.",
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
