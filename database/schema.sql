-- Kiara Medicals — prototype schema (MySQL 8+)
CREATE DATABASE IF NOT EXISTS kiara_medicals
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kiara_medicals;

CREATE TABLE branches (
  branch_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_code VARCHAR(20) NOT NULL UNIQUE,
  branch_name VARCHAR(120) NOT NULL,
  legal_name VARCHAR(200) NOT NULL,
  address VARCHAR(500) NOT NULL DEFAULT '',
  phone VARCHAR(20) NOT NULL DEFAULT '',
  gstin CHAR(15) NOT NULL UNIQUE,
  invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'KM',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NULL,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'SHOP_USER') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_branch
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
) ENGINE=InnoDB;

CREATE TABLE salts (
  salt_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salt_name VARCHAR(200) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE products (
  product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(200) NOT NULL,
  brand VARCHAR(120) NULL,
  salt_id INT UNSIGNED NULL,
  strength VARCHAR(80) NULL,
  dosage_form VARCHAR(80) NULL,
  packaging VARCHAR(120) NULL,
  product_type ENUM('MEDICINE', 'OTC', 'OTHER') NOT NULL DEFAULT 'MEDICINE',
  stock_unit_label VARCHAR(40) NOT NULL DEFAULT 'strip',
  smallest_unit_label VARCHAR(40) NOT NULL DEFAULT 'tablet',
  units_per_stock_unit INT UNSIGNED NOT NULL DEFAULT 1,
  default_hsn_code VARCHAR(20) NULL,
  default_gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  is_h1_or_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_salt FOREIGN KEY (salt_id) REFERENCES salts(salt_id)
) ENGINE=InnoDB;

CREATE TABLE racks (
  rack_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  rack_code VARCHAR(20) NOT NULL,
  UNIQUE KEY uq_rack_branch (branch_id, rack_code),
  CONSTRAINT fk_racks_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
) ENGINE=InnoDB;

CREATE TABLE branch_products (
  branch_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  rack_id INT UNSIGNED NULL,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 10,
  PRIMARY KEY (branch_id, product_id),
  CONSTRAINT fk_bp_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_bp_product FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_bp_rack FOREIGN KEY (rack_id) REFERENCES racks(rack_id)
) ENGINE=InnoDB;

CREATE TABLE batches (
  batch_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  batch_number VARCHAR(60) NOT NULL,
  expiry_date DATE NULL,
  mrp DECIMAL(12, 2) NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  UNIQUE KEY uq_batch_branch_product (branch_id, product_id, batch_number),
  CONSTRAINT fk_batches_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_batches_product FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE TABLE inventory (
  branch_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  loose_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  selling_price DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (branch_id, batch_id),
  CONSTRAINT fk_inv_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_inv_batch FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
) ENGINE=InnoDB;

CREATE TABLE patients (
  patient_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  mobile VARCHAR(20) NULL,
  CONSTRAINT fk_patients_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
) ENGINE=InnoDB;

CREATE TABLE doctors (
  doctor_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  CONSTRAINT fk_doctors_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
) ENGINE=InnoDB;

CREATE TABLE sales (
  sale_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  patient_id INT UNSIGNED NULL,
  doctor_id INT UNSIGNED NULL,
  sale_type ENUM('BILLED', 'UNBILLED') NOT NULL,
  status ENUM('FINALIZED', 'CANCELLED') NOT NULL DEFAULT 'FINALIZED',
  invoice_number VARCHAR(80) NULL,
  client_transaction_id CHAR(36) NOT NULL UNIQUE,
  sale_datetime DATETIME(3) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  taxable_total DECIMAL(12, 2) NOT NULL,
  cgst_total DECIMAL(12, 2) NOT NULL,
  sgst_total DECIMAL(12, 2) NOT NULL,
  igst_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12, 2) NOT NULL,
  notes TEXT NULL,
  created_by INT UNSIGNED NOT NULL,
  CONSTRAINT fk_sales_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT fk_sales_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  CONSTRAINT fk_sales_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
  CONSTRAINT fk_sales_user FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE sale_items (
  sale_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  product_name_snapshot VARCHAR(200) NOT NULL,
  batch_number_snapshot VARCHAR(60) NOT NULL,
  expiry_date_snapshot DATE NULL,
  quantity INT UNSIGNED NOT NULL,
  mrp DECIMAL(12, 2) NOT NULL,
  unit_selling_price DECIMAL(12, 4) NOT NULL,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  hsn_code VARCHAR(20) NULL,
  gst_rate DECIMAL(5, 2) NOT NULL,
  taxable_amount DECIMAL(12, 2) NOT NULL,
  cgst_amount DECIMAL(12, 2) NOT NULL,
  sgst_amount DECIMAL(12, 2) NOT NULL,
  igst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL,
  quantity_unit VARCHAR(30) NULL,
  base_quantity_units INT UNSIGNED NULL,
  conversion_factor_snapshot INT UNSIGNED NULL,
  stock_quantity_snapshot INT UNSIGNED NULL,
  CONSTRAINT fk_si_sale FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
  CONSTRAINT fk_si_batch FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
) ENGINE=InnoDB;

CREATE TABLE stock_transactions (
  stock_tx_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  transaction_type VARCHAR(30) NOT NULL,
  quantity_delta INT NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  source_key VARCHAR(80) NOT NULL,
  idempotency_key CHAR(36) NOT NULL UNIQUE,
  notes VARCHAR(500) NULL,
  occurred_at DATETIME(3) NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  CONSTRAINT fk_st_batch FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
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

CREATE TABLE purchases (
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

CREATE TABLE purchase_items (
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

CREATE TABLE customer_returns (
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

CREATE TABLE customer_return_items (
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

CREATE TABLE supplier_returns (
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

CREATE TABLE supplier_return_items (
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
