const { randomUUID } = require("crypto");

async function getBatchStock(connection, branchId, batchId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
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
       p.smallest_unit_label,
       ba.batch_number,
       ba.expiry_date,
       ba.mrp,
       ba.purchase_price
     FROM inventory i
     JOIN batches ba ON ba.batch_id = i.batch_id AND ba.branch_id = i.branch_id
     JOIN products p ON p.product_id = ba.product_id
     WHERE i.branch_id = ? AND i.batch_id = ?
     ${lock}`,
    [branchId, batchId]
  );
  return rows[0] || null;
}

function availableSmallestUnits(stock) {
  const packSize = Number(stock.units_per_stock_unit || 1);
  return Number(stock.quantity) * packSize + Number(stock.loose_quantity || 0);
}

async function setStockUnits(connection, branchId, batchId, totalSmallestUnits) {
  const [meta] = await connection.execute(
    `SELECT p.units_per_stock_unit
     FROM inventory i
     JOIN batches ba ON ba.batch_id = i.batch_id
     JOIN products p ON p.product_id = ba.product_id
     WHERE i.branch_id = ? AND i.batch_id = ?`,
    [branchId, batchId]
  );
  const packSize = Number(meta[0]?.units_per_stock_unit || 1);
  const remaining = Math.max(0, totalSmallestUnits);
  await connection.execute(
    `UPDATE inventory
     SET quantity = ?, loose_quantity = ?
     WHERE branch_id = ? AND batch_id = ?`,
    [
      Math.floor(remaining / packSize),
      remaining % packSize,
      branchId,
      batchId,
    ]
  );
}

async function recordStockMovement(
  connection,
  {
    branchId,
    batchId,
    quantityDelta,
    transactionType,
    sourceType,
    sourceKey,
    notes,
    userId,
  }
) {
  await connection.execute(
    `INSERT INTO stock_transactions (
       branch_id, batch_id, transaction_type, quantity_delta,
       source_type, source_key, idempotency_key, notes, occurred_at, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3), ?)`,
    [
      branchId,
      batchId,
      transactionType,
      quantityDelta,
      sourceType,
      sourceKey,
      randomUUID(),
      notes || null,
      userId,
    ]
  );
}

function resolveBranchId(user, requestedBranchId) {
  if (user.role === "SHOP_USER") return Number(user.branchId);
  if (user.role === "ADMIN" && requestedBranchId) return Number(requestedBranchId);
  return null;
}

module.exports = {
  getBatchStock,
  availableSmallestUnits,
  setStockUnits,
  recordStockMovement,
  resolveBranchId,
};
