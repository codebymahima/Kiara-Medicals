USE defaultdb;

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NULL,
  gstin VARCHAR(15) NULL,
  address VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_suppliers_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchases (
  purchase_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  supplier_id INT UNSIGNED NOT NULL,
  supplier_invoice_number VARCHAR(80) NOT NULL,
  purchase_datetime DATETIME(3) NOT NULL,
  payment_method ENUM('CASH', 'CHEQUE') NOT NULL DEFAULT 'CASH',
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  taxable_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cgst_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sgst_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12, 2) NOT NULL,
  status ENUM('FINALIZED', 'CANCELLED') NOT NULL DEFAULT 'FINALIZED',
  client_transaction_id CHAR(36) NOT NULL UNIQUE,
  notes TEXT NULL,
  created_by INT UNSIGNED NOT NULL,
  CONSTRAINT fk_purch_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_purch_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
  CONSTRAINT fk_purch_user FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_items (
  purchase_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_id BIGINT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  batch_number VARCHAR(60) NOT NULL,
  expiry_date DATE NULL,
  quantity_packs INT UNSIGNED NOT NULL,
  quantity_smallest_units INT UNSIGNED NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  mrp DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  hsn_code VARCHAR(20) NULL,
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 5,
  line_total DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_pi_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id),
  CONSTRAINT fk_pi_product FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_pi_batch FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_returns (
  customer_return_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  sale_id BIGINT UNSIGNED NOT NULL,
  return_datetime DATETIME(3) NOT NULL,
  credit_note_number VARCHAR(80) NOT NULL,
  return_total DECIMAL(12, 2) NOT NULL,
  client_transaction_id CHAR(36) NOT NULL UNIQUE,
  notes TEXT NULL,
  created_by INT UNSIGNED NOT NULL,
  CONSTRAINT fk_cr_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_cr_sale FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
  CONSTRAINT fk_cr_user FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_return_items (
  customer_return_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_return_id BIGINT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  sale_item_id BIGINT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  refund_amount DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_cri_return FOREIGN KEY (customer_return_id) REFERENCES customer_returns(customer_return_id),
  CONSTRAINT fk_cri_sale_item FOREIGN KEY (sale_item_id) REFERENCES sale_items(sale_item_id),
  CONSTRAINT fk_cri_batch FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplier_returns (
  supplier_return_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  supplier_id INT UNSIGNED NOT NULL,
  return_datetime DATETIME(3) NOT NULL,
  reference_number VARCHAR(80) NOT NULL,
  return_total DECIMAL(12, 2) NOT NULL,
  reason VARCHAR(500) NULL,
  client_transaction_id CHAR(36) NOT NULL UNIQUE,
  created_by INT UNSIGNED NOT NULL,
  CONSTRAINT fk_sr_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_sr_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
  CONSTRAINT fk_sr_user FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplier_return_items (
  supplier_return_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_return_id BIGINT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_sri_return FOREIGN KEY (supplier_return_id) REFERENCES supplier_returns(supplier_return_id),
  CONSTRAINT fk_sri_batch FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
) ENGINE=InnoDB;

UPDATE branch_products SET low_stock_threshold = 10;
