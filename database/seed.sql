USE defaultdb;

INSERT INTO branches (
  branch_code, branch_name, legal_name, address, phone, gstin, invoice_prefix
) VALUES
(
  'BR001',
  'Kiara Medicals — Koramangala',
  'Kiara Medicals Koramangala Pvt Ltd',
  '12th Main, Koramangala 5th Block, Bengaluru, Karnataka 560034',
  '08025551234',
  '29AABCK1234A1Z5',
  'KM-KOR'
),
(
  'BR002',
  'Kiara Medicals — Indiranagar',
  'Kiara Medicals Indiranagar Pvt Ltd',
  '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
  '08025555678',
  '29AABCK5678B1Z3',
  'KM-IND'
),
(
  'BR003',
  'Kiara Medicals — Whitefield',
  'Kiara Medicals Whitefield Pvt Ltd',
  'ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066',
  '08025559012',
  '29AABCK9012C1Z1',
  'KM-WHT'
);

INSERT INTO salts (salt_name) VALUES
('Paracetamol'),
('Amoxicillin'),
('Azithromycin'),
('Cetirizine'),
('Pantoprazole');

INSERT INTO products (
  product_name, brand, salt_id, strength, dosage_form, packaging,
  stock_unit_label, smallest_unit_label, units_per_stock_unit,
  default_hsn_code, default_gst_rate
) VALUES
('Dolo 650', 'Micro Labs', 1, '650mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5),
('Calpol 500', 'GSK', 1, '500mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5),
('Moxikind CV 625', 'Mankind', 2, '625mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30041090', 5),
('Azithral 500', 'Alembic', 3, '500mg', 'Tablet', '5 tablets/strip', 'strip', 'tablet', 5, '30042019', 5),
('Cetzine', 'Dr Reddy''s', 4, '10mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5),
('Pan 40', 'Alkem', 5, '40mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5);

INSERT INTO branch_products (branch_id, product_id, low_stock_threshold)
SELECT b.branch_id, p.product_id, 10
FROM branches b
CROSS JOIN products p;

INSERT INTO suppliers (branch_id, supplier_name, phone, gstin)
SELECT branch_id, CONCAT('Default Pharma Distributor — ', branch_code), phone, gstin
FROM branches;

INSERT INTO racks (branch_id, rack_code)
SELECT branch_id, code FROM branches
CROSS JOIN (
  SELECT 'A1' AS code UNION SELECT 'A2' UNION SELECT 'B1'
) r;

-- Sample stock per branch (batch numbers differ per branch)
INSERT INTO batches (branch_id, product_id, batch_number, expiry_date, mrp, purchase_price)
SELECT 1, product_id,
  CONCAT('KOR-B', LPAD(product_id, 3, '0')),
  DATE_ADD(CURDATE(), INTERVAL 18 MONTH),
  50 + product_id * 10,
  35 + product_id * 7
FROM products;

INSERT INTO inventory (branch_id, batch_id, quantity, loose_quantity, selling_price)
SELECT 1, batch_id, 20, 0, mrp * 0.9 FROM batches WHERE branch_id = 1;

INSERT INTO batches (branch_id, product_id, batch_number, expiry_date, mrp, purchase_price)
SELECT 2, product_id,
  CONCAT('IND-B', LPAD(product_id, 3, '0')),
  DATE_ADD(CURDATE(), INTERVAL 14 MONTH),
  50 + product_id * 10,
  35 + product_id * 7
FROM products;

INSERT INTO inventory (branch_id, batch_id, quantity, loose_quantity, selling_price)
SELECT 2, batch_id, 15, 5, mrp * 0.9 FROM batches WHERE branch_id = 2;

INSERT INTO batches (branch_id, product_id, batch_number, expiry_date, mrp, purchase_price)
SELECT 3, product_id,
  CONCAT('WHT-B', LPAD(product_id, 3, '0')),
  DATE_ADD(CURDATE(), INTERVAL 12 MONTH),
  50 + product_id * 10,
  35 + product_id * 7
FROM products;

INSERT INTO inventory (branch_id, batch_id, quantity, loose_quantity, selling_price)
SELECT 3, batch_id, 10, 0, mrp * 0.9 FROM batches WHERE branch_id = 3;
