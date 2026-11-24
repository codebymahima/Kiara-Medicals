// In-memory fallback database when external MySQL is paused or unreachable
const bcrypt = require("bcryptjs");

const branches = [
  {
    branch_id: 1,
    branch_code: "BR001",
    branch_name: "Kiara Medicals A",
    legal_name: "Kiara Medicals A Pvt Ltd",
    address: "12th Main, Koramangala 5th Block, Bengaluru, Karnataka 560034",
    phone: "08025551234",
    gstin: "29AABCK1234A1Z5",
    invoice_prefix: "KM-A",
    is_active: 1,
    created_at: new Date(),
  },
  {
    branch_id: 2,
    branch_code: "BR002",
    branch_name: "Kiara Medicals B",
    legal_name: "Kiara Medicals B Pvt Ltd",
    address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    phone: "08025555678",
    gstin: "29AABCK5678B1Z3",
    invoice_prefix: "KM-B",
    is_active: 1,
    created_at: new Date(),
  },
  {
    branch_id: 3,
    branch_code: "BR003",
    branch_name: "Kiara Medicals C",
    legal_name: "Kiara Medicals C Pvt Ltd",
    address: "ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066",
    phone: "08025559012",
    gstin: "29AABCK9012C1Z1",
    invoice_prefix: "KM-C",
    is_active: 1,
    created_at: new Date(),
  },
];

const users = [
  {
    user_id: 1,
    branch_id: null,
    full_name: "Test Administrator",
    username: "testadmin",
    password_hash: "$2b$10$FEYU3nRCSTRQ.Ra6hlK74.lLLa5ubK5uXxF5tIIvozV2NNcM5WaMm",
    role: "ADMIN",
    is_active: 1,
    last_login_at: null,
  },
  {
    user_id: 2,
    branch_id: 1,
    full_name: "Test Shop Manager A",
    username: "managera",
    password_hash: "$2b$10$Rz6FwVx6STds78ngpjzTCugWpedLn.SjMTrU9AZJ6W.xY69YvTeb.",
    role: "SHOP_MANAGER",
    is_active: 1,
    last_login_at: null,
  },
  {
    user_id: 3,
    branch_id: 1,
    full_name: "Test Shop Worker A",
    username: "workera",
    password_hash: "$2b$10$JtBvqnoNY8fqcFoy07Y91.cpBw0sP/jQ84460VGBbBMm1mda0124K",
    role: "SHOP_WORKER",
    is_active: 1,
    last_login_at: null,
  },
  {
    user_id: 4,
    branch_id: 1,
    full_name: "Test Shop A User",
    username: "shopa",
    password_hash: "$2b$10$ZHTIrGIEppeuoRKBetGKUOFEBVC27HOJFvSetA7JeYmOlaxbP.78G",
    role: "SHOP_USER",
    is_active: 1,
    last_login_at: null,
  },
  {
    user_id: 5,
    branch_id: 2,
    full_name: "Test Shop B User",
    username: "shopb",
    password_hash: "$2b$10$ttfTU9fJMSbt3tDjg8cgKehdPdbWpLlBKXD2K2k6bY/Uv.10ztcXu",
    role: "SHOP_USER",
    is_active: 1,
    last_login_at: null,
  },
  {
    user_id: 6,
    branch_id: 3,
    full_name: "Test Shop C User",
    username: "shopc",
    password_hash: "$2b$10$QZsICn/6HQWSZ7yuvM62EuYThARQrQSslOfyerVIJ4AmjgKjJK.by",
    role: "SHOP_USER",
    is_active: 1,
    last_login_at: null,
  },
];

const products = [
  { product_id: 1, product_name: "Dolo 650", brand: "Micro Labs", strength: "650mg", dosage_form: "Tablet", packaging: "15 tablets/strip", stock_unit_label: "strip", smallest_unit_label: "tablet", units_per_stock_unit: 15, default_hsn_code: "30049099", default_gst_rate: 5, is_active: 1, is_h1_or_restricted: 0 },
  { product_id: 2, product_name: "Calpol 500", brand: "GSK", strength: "500mg", dosage_form: "Tablet", packaging: "15 tablets/strip", stock_unit_label: "strip", smallest_unit_label: "tablet", units_per_stock_unit: 15, default_hsn_code: "30049099", default_gst_rate: 5, is_active: 1, is_h1_or_restricted: 0 },
  { product_id: 3, product_name: "Moxikind CV 625", brand: "Mankind", strength: "625mg", dosage_form: "Tablet", packaging: "10 tablets/strip", stock_unit_label: "strip", smallest_unit_label: "tablet", units_per_stock_unit: 10, default_hsn_code: "30041090", default_gst_rate: 5, is_active: 1, is_h1_or_restricted: 0 },
  { product_id: 4, product_name: "Azithral 500", brand: "Alembic", strength: "500mg", dosage_form: "Tablet", packaging: "5 tablets/strip", stock_unit_label: "strip", smallest_unit_label: "tablet", units_per_stock_unit: 5, default_hsn_code: "30042019", default_gst_rate: 5, is_active: 1, is_h1_or_restricted: 0 },
  { product_id: 5, product_name: "Cetzine", brand: "Dr Reddy's", strength: "10mg", dosage_form: "Tablet", packaging: "10 tablets/strip", stock_unit_label: "strip", smallest_unit_label: "tablet", units_per_stock_unit: 10, default_hsn_code: "30049099", default_gst_rate: 5, is_active: 1, is_h1_or_restricted: 0 },
  { product_id: 6, product_name: "Pan 40", brand: "Alkem", strength: "40mg", dosage_form: "Tablet", packaging: "15 tablets/strip", stock_unit_label: "strip", smallest_unit_label: "tablet", units_per_stock_unit: 15, default_hsn_code: "30049099", default_gst_rate: 5, is_active: 1, is_h1_or_restricted: 0 },
];

const batches = [
  { batch_id: 1, branch_id: 1, product_id: 1, batch_number: "KOR-B001", expiry_date: "2027-10-31", mrp: 60, purchase_price: 42 },
  { batch_id: 2, branch_id: 1, product_id: 2, batch_number: "KOR-B002", expiry_date: "2027-09-30", mrp: 70, purchase_price: 49 },
  { batch_id: 3, branch_id: 1, product_id: 3, batch_number: "KOR-B003", expiry_date: "2027-12-31", mrp: 80, purchase_price: 56 },
  { batch_id: 4, branch_id: 1, product_id: 4, batch_number: "KOR-B004", expiry_date: "2027-11-30", mrp: 90, purchase_price: 63 },
  { batch_id: 5, branch_id: 1, product_id: 5, batch_number: "KOR-B005", expiry_date: "2027-08-31", mrp: 100, purchase_price: 70 },
  { batch_id: 6, branch_id: 1, product_id: 6, batch_number: "KOR-B006", expiry_date: "2027-07-31", mrp: 110, purchase_price: 77 },
  { batch_id: 7, branch_id: 2, product_id: 1, batch_number: "IND-B001", expiry_date: "2027-08-31", mrp: 60, purchase_price: 42 },
  { batch_id: 8, branch_id: 2, product_id: 2, batch_number: "IND-B002", expiry_date: "2027-07-31", mrp: 70, purchase_price: 49 },
  { batch_id: 9, branch_id: 3, product_id: 1, batch_number: "WHT-B001", expiry_date: "2027-06-30", mrp: 60, purchase_price: 42 },
  { batch_id: 10, branch_id: 3, product_id: 2, batch_number: "WHT-B002", expiry_date: "2027-05-31", mrp: 70, purchase_price: 49 },
];

const inventory = [
  { inventory_id: 1, branch_id: 1, batch_id: 1, quantity: 25, loose_quantity: 4, selling_price: 54 },
  { inventory_id: 2, branch_id: 1, batch_id: 2, quantity: 30, loose_quantity: 0, selling_price: 63 },
  { inventory_id: 3, branch_id: 1, batch_id: 3, quantity: 20, loose_quantity: 2, selling_price: 72 },
  { inventory_id: 4, branch_id: 1, batch_id: 4, quantity: 18, loose_quantity: 0, selling_price: 81 },
  { inventory_id: 5, branch_id: 1, batch_id: 5, quantity: 22, loose_quantity: 5, selling_price: 90 },
  { inventory_id: 6, branch_id: 1, batch_id: 6, quantity: 15, loose_quantity: 0, selling_price: 99 },
  { inventory_id: 7, branch_id: 2, batch_id: 7, quantity: 18, loose_quantity: 0, selling_price: 54 },
  { inventory_id: 8, branch_id: 2, batch_id: 8, quantity: 15, loose_quantity: 0, selling_price: 63 },
  { inventory_id: 9, branch_id: 3, batch_id: 9, quantity: 12, loose_quantity: 0, selling_price: 54 },
  { inventory_id: 10, branch_id: 3, batch_id: 10, quantity: 10, loose_quantity: 0, selling_price: 63 },
];

const patients = [
  { patient_id: 1, branch_id: 1, full_name: "Ramesh Sharma", mobile: "9876543210" },
  { patient_id: 2, branch_id: 1, full_name: "Pooja Patel", mobile: "9812345678" },
  { patient_id: 3, branch_id: 2, full_name: "Amit Verma", mobile: "9823456789" },
  { patient_id: 4, branch_id: 3, full_name: "Sneha Reddy", mobile: "9834567890" },
];

const sales = [
  {
    sale_id: 1,
    branch_id: 1,
    patient_id: 1,
    doctor_id: null,
    sale_type: "BILLED",
    status: "FINALIZED",
    invoice_number: "KM-A-1001",
    client_transaction_id: "tx-1",
    sale_datetime: new Date(Date.now() - 3600000 * 2),
    payment_method: "CASH",
    subtotal: 350.0,
    discount_total: 20.0,
    taxable_total: 314.29,
    cgst_total: 7.86,
    sgst_total: 7.86,
    igst_total: 0,
    grand_total: 330.0,
    notes: "Patient: Ramesh Sharma | Mobile: 9876543210",
  },
  {
    sale_id: 2,
    branch_id: 1,
    patient_id: 2,
    doctor_id: null,
    sale_type: "BILLED",
    status: "FINALIZED",
    invoice_number: "KM-A-1002",
    client_transaction_id: "tx-2",
    sale_datetime: new Date(Date.now() - 3600000 * 5),
    payment_method: "UPI",
    subtotal: 540.0,
    discount_total: 40.0,
    taxable_total: 476.19,
    cgst_total: 11.9,
    sgst_total: 11.9,
    igst_total: 0,
    grand_total: 500.0,
    notes: "Patient: Pooja Patel | Mobile: 9812345678",
  },
  {
    sale_id: 3,
    branch_id: 2,
    patient_id: 3,
    doctor_id: null,
    sale_type: "BILLED",
    status: "FINALIZED",
    invoice_number: "KM-B-2001",
    client_transaction_id: "tx-3",
    sale_datetime: new Date(Date.now() - 3600000 * 3),
    payment_method: "CARD",
    subtotal: 450.0,
    discount_total: 0.0,
    taxable_total: 428.57,
    cgst_total: 10.71,
    sgst_total: 10.71,
    igst_total: 0,
    grand_total: 450.0,
    notes: "Patient: Amit Verma | Mobile: 9823456789",
  },
  {
    sale_id: 4,
    branch_id: 3,
    patient_id: 4,
    doctor_id: null,
    sale_type: "BILLED",
    status: "FINALIZED",
    invoice_number: "KM-C-3001",
    client_transaction_id: "tx-4",
    sale_datetime: new Date(Date.now() - 3600000 * 4),
    payment_method: "CASH",
    subtotal: 300.0,
    discount_total: 10.0,
    taxable_total: 276.19,
    cgst_total: 6.9,
    sgst_total: 6.9,
    igst_total: 0,
    grand_total: 290.0,
    notes: "Patient: Sneha Reddy | Mobile: 9834567890",
  },
];

const sale_items = [
  { sale_item_id: 1, sale_id: 1, branch_id: 1, batch_id: 1, product_id: 1, product_name_snapshot: "Dolo 650", batch_number_snapshot: "KOR-B001", expiry_date_snapshot: "2027-10-31", quantity: 5, mrp_snapshot: 60, unit_price: 3.6, discount_amount: 10, gst_rate: 5, line_total: 170 },
  { sale_item_id: 2, sale_id: 1, branch_id: 1, batch_id: 2, product_id: 2, product_name_snapshot: "Calpol 500", batch_number_snapshot: "KOR-B002", expiry_date_snapshot: "2027-09-30", quantity: 4, mrp_snapshot: 70, unit_price: 4.2, discount_amount: 10, gst_rate: 5, line_total: 160 },
  { sale_item_id: 3, sale_id: 2, branch_id: 1, batch_id: 3, product_id: 3, product_name_snapshot: "Moxikind CV 625", batch_number_snapshot: "KOR-B003", expiry_date_snapshot: "2027-12-31", quantity: 5, mrp_snapshot: 80, unit_price: 7.2, discount_amount: 40, gst_rate: 5, line_total: 500 },
];

const purchases = [
  { purchase_id: 1, branch_id: 1, supplier_id: 1, supplier_invoice_number: "SUP-101", purchase_datetime: new Date(), grand_total: 1250, status: "FINALIZED" },
  { purchase_id: 2, branch_id: 2, supplier_id: 2, supplier_invoice_number: "SUP-201", purchase_datetime: new Date(), grand_total: 980, status: "FINALIZED" },
  { purchase_id: 3, branch_id: 3, supplier_id: 3, supplier_invoice_number: "SUP-301", purchase_datetime: new Date(), grand_total: 750, status: "FINALIZED" },
];

const customer_returns = [];

// Query dispatcher
async function executeMockQuery(sql, params = []) {
  const norm = sql.replace(/\s+/g, " ").trim();

  // 1. SELECT DATABASE()
  if (norm.includes("SELECT DATABASE()")) {
    return [[{ databaseName: "kiara_medicals_local", mysqlVersion: "8.4.0-mock" }]];
  }

  // 2. Auth login & token verification
  if (norm.includes("FROM users u") && (norm.includes("WHERE u.username = ?") || norm.includes("WHERE u.user_id = ?"))) {
    const isById = norm.includes("u.user_id = ?");
    const val = params[0];
    const user = isById
      ? users.find((u) => String(u.user_id) === String(val))
      : users.find((u) => u.username === val);
    if (!user) return [[]];
    const branch = branches.find((b) => b.branch_id === user.branch_id);
    return [[{
      ...user,
      branch_name: branch ? branch.branch_name : null,
      branch_is_active: branch ? branch.is_active : 1,
    }]];
  }

  // 3. Update last login
  if (norm.startsWith("UPDATE users SET last_login_at")) {
    const user = users.find((u) => u.user_id === params[1]);
    if (user) user.last_login_at = params[0];
    return [{ affectedRows: 1 }];
  }

  // Branches query
  if (norm.includes("FROM branches") && !norm.includes("sales s")) {
    return [branches];
  }

  // 5. Admin overview: sales by branch
  if (norm.includes("COUNT(*) AS sale_count, COALESCE(SUM(s.grand_total), 0) AS total_sales FROM sales s")) {
    const result = [];
    for (const b of branches) {
      const bSales = sales.filter((s) => s.branch_id === b.branch_id && s.status === "FINALIZED");
      const total = bSales.reduce((acc, s) => acc + Number(s.grand_total), 0);
      result.push({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
        sale_count: bSales.length,
        total_sales: total,
      });
    }
    return [result];
  }

  // 6. Admin overview: totals
  if (norm.includes("COUNT(*) AS sale_count, COALESCE(SUM(grand_total), 0) AS total_sales FROM sales WHERE status = 'FINALIZED'")) {
    const finalized = sales.filter((s) => s.status === "FINALIZED");
    const total = finalized.reduce((acc, s) => acc + Number(s.grand_total), 0);
    return [[{ sale_count: finalized.length, total_sales: total }]];
  }

  // 7. Product count
  if (norm.includes("SELECT COUNT(*) AS count FROM products WHERE is_active = TRUE")) {
    return [[{ count: products.filter((p) => p.is_active).length }]];
  }

  // 8. Admin branches list
  if (norm.includes("SELECT") && norm.includes("FROM branches") && norm.includes("ORDER BY branch_id ASC")) {
    return [branches];
  }

  // 9. Update branch details
  if (norm.startsWith("UPDATE branches SET")) {
    const branchId = params[params.length - 1];
    const branch = branches.find((b) => b.branch_id === branchId);
    if (branch) {
      if (norm.includes("is_active = ?")) {
        const idx = norm.indexOf("is_active = ?");
        // find index in params
        branch.is_active = params[0] ? 1 : 0;
      }
      if (norm.includes("branch_name = ?")) {
        // Find in params
        for (const p of params) {
          if (typeof p === "string" && p.startsWith("Kiara Medicals")) branch.branch_name = p;
        }
      }
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 10. Admin users list
  if (norm.includes("FROM users u") && norm.includes("ORDER BY u.user_id ASC")) {
    const result = users.map((u) => {
      const b = branches.find((br) => br.branch_id === u.branch_id);
      return {
        ...u,
        branch_name: b ? b.branch_name : null,
        branch_code: b ? b.branch_code : null,
      };
    });
    return [result];
  }

  // 11. Admin sales list (with patient join and search)
  if (norm.includes("FROM sales s") && norm.includes("JOIN branches b ON b.branch_id = s.branch_id")) {
    let list = sales.map((s) => {
      const b = branches.find((br) => br.branch_id === s.branch_id);
      const p = patients.find((pt) => pt.patient_id === s.patient_id);
      return {
        ...s,
        branch_name: b ? b.branch_name : "Kiara Medicals",
        patient_full_name: p ? p.full_name : "Walk-in Patient",
        patient_name: p ? p.full_name : "Walk-in Patient",
        patientName: p ? p.full_name : "Walk-in Patient",
        patient_mobile_db: p ? p.mobile : null,
        patient_mobile: p ? p.mobile : null,
        patientMobile: p ? p.mobile : null,
      };
    });

    if (params.length > 0 && typeof params[0] === "number") {
      list = list.filter((s) => s.branch_id === params[0]);
    }
    return [list];
  }

  // 12. Analytics: branch metrics
  if (norm.includes("SELECT COALESCE(SUM(grand_total), 0) AS total FROM sales") && norm.includes("sale_type = 'BILLED'")) {
    const branchId = params[0];
    const bSales = sales.filter((s) => s.branch_id === branchId && s.sale_type === "BILLED" && s.status === "FINALIZED");
    const total = bSales.reduce((acc, s) => acc + Number(s.grand_total), 0);
    return [[{ total }]];
  }

  if (norm.includes("SELECT COALESCE(SUM(grand_total), 0) AS total FROM sales") && norm.includes("sale_type = 'UNBILLED'")) {
    const branchId = params[0];
    const bSales = sales.filter((s) => s.branch_id === branchId && s.sale_type === "UNBILLED");
    const total = bSales.reduce((acc, s) => acc + Number(s.grand_total), 0);
    return [[{ total }]];
  }

  if (norm.includes("FROM customer_returns WHERE branch_id = ?")) {
    return [[{ total: 0 }]];
  }

  if (norm.includes("FROM purchases WHERE branch_id = ?")) {
    const branchId = params[0];
    const bPurchases = purchases.filter((p) => p.branch_id === branchId);
    const total = bPurchases.reduce((acc, p) => acc + Number(p.grand_total), 0);
    return [[{ total }]];
  }

  // 13. Billing: recent / search
  if (norm.includes("FROM sales s") && norm.includes("sale_type = 'BILLED'")) {
    const branchId = params[0];
    const bSales = sales.filter((s) => s.branch_id === branchId && s.sale_type === "BILLED");
    const enriched = bSales.map((s) => {
      const p = patients.find((pt) => pt.patient_id === s.patient_id);
      return {
        ...s,
        patient_full_name: p ? p.full_name : "Walk-in Patient",
        patient_name: p ? p.full_name : "Walk-in Patient",
        patientName: p ? p.full_name : "Walk-in Patient",
        patient_mobile_db: p ? p.mobile : null,
        patient_mobile: p ? p.mobile : null,
        patientMobile: p ? p.mobile : null,
      };
    });
    return [enriched];
  }

  // 14. Billing / Inventory: medicines search
  if (norm.includes("FROM inventory i") || (norm.includes("FROM products p") && norm.includes("batches b"))) {
    const isSingleBatch = norm.includes("i.batch_id = ?") || norm.includes("ba.batch_id = ?");
    const targetBranch = params.find((p) => typeof p === "number" || (/^\d+$/.test(String(p)) && Number(p) <= 10));
    const targetBatch = isSingleBatch ? params[1] : null;

    const res = [];
    for (const inv of inventory) {
      if (targetBranch != null && Number(inv.branch_id) !== Number(targetBranch)) continue;
      if (targetBatch != null && Number(inv.batch_id) !== Number(targetBatch)) continue;
      const b = batches.find((bat) => bat.batch_id === inv.batch_id);
      if (!b) continue;
      const p = products.find((pr) => pr.product_id === b.product_id);
      if (!p) continue;
      res.push({
        inventory_id: inv.inventory_id,
        branch_id: inv.branch_id,
        batch_id: inv.batch_id,
        product_id: p.product_id,
        product_name: p.product_name,
        brand: p.brand,
        strength: p.strength,
        dosage_form: p.dosage_form,
        packaging: p.packaging,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        quantity: inv.quantity,
        loose_quantity: inv.loose_quantity,
        selling_price: inv.selling_price,
        mrp: b.mrp,
        stock_unit_label: p.stock_unit_label,
        smallest_unit_label: p.smallest_unit_label,
        units_per_stock_unit: p.units_per_stock_unit,
        default_hsn_code: p.default_hsn_code,
        default_gst_rate: p.default_gst_rate,
        available_smallest_units: (inv.quantity * (p.units_per_stock_unit || 1)) + (inv.loose_quantity || 0),
      });
    }
    return [res];
  }

  // 15. Products list
  if (norm.includes("FROM products") && !norm.includes("COUNT(*)")) {
    return [products];
  }

  // 16. Inventory list
  if (norm.includes("FROM inventory")) {
    return [inventory];
  }

  // 17. Patients search
  if (norm.includes("FROM patients")) {
    return [patients];
  }

  // 18. Alerts: low stock
  if (norm.includes("FROM inventory") && norm.includes("low_stock")) {
    return [[]];
  }
  if (norm.includes("expiry")) {
    return [[]];
  }

  // 19. Insert into sales
  if (norm.startsWith("INSERT INTO sales")) {
    const saleId = sales.length + 1;
    const branchId = params[0];
    const branch = branches.find((b) => b.branch_id === branchId) || branches[0];
    const newSale = {
      sale_id: saleId,
      branch_id: branchId,
      patient_id: params[1],
      doctor_id: params[2],
      sale_type: "BILLED",
      status: "FINALIZED",
      invoice_number: params[3],
      client_transaction_id: params[4],
      sale_datetime: new Date(),
      payment_method: params[5],
      subtotal: params[6],
      discount_total: params[7],
      taxable_total: params[8],
      cgst_total: params[9],
      sgst_total: params[10],
      grand_total: params[11],
      notes: params[12],
    };
    sales.unshift(newSale);
    return [{ insertId: saleId, affectedRows: 1 }];
  }

  // 20. Insert sale items
  if (norm.startsWith("INSERT INTO sale_items")) {
    return [{ insertId: sale_items.length + 1, affectedRows: 1 }];
  }

  // 21. Insert user
  if (norm.startsWith("INSERT INTO users")) {
    const userId = users.length + 1;
    const newUser = {
      user_id: userId,
      branch_id: params[0],
      full_name: params[1],
      username: params[2],
      password_hash: params[3],
      role: params[4],
      is_active: 1,
      last_login_at: null,
    };
    users.push(newUser);
    return [{ insertId: userId, affectedRows: 1 }];
  }

  // Default fallback
  return [[]];
}

// Mock Connection object for transactions
function createMockConnection() {
  return {
    execute: executeMockQuery,
    query: executeMockQuery,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
}

module.exports = {
  executeMockQuery,
  createMockConnection,
  mockData: { branches, users, products, batches, inventory, sales, patients },
};
