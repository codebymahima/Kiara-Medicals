-- Adds 55 medicines + branch stock (run once on existing kiara_medicals DB)
USE kiara_medicals;

INSERT IGNORE INTO salts (salt_name) VALUES
('Ibuprofen'),
('Metformin'),
('Atorvastatin'),
('Losartan'),
('Omeprazole'),
('Domperidone'),
('Salbutamol'),
('Montelukast'),
('Diclofenac'),
('Cefixime'),
('Levocetirizine'),
('Rabeprazole'),
('Telmisartan'),
('Amlodipine'),
('Hydrochlorothiazide'),
('Clopidogrel'),
('Aspirin'),
('Metronidazole'),
('Ofloxacin'),
('Fluconazole'),
('Prednisolone'),
('Dexamethasone'),
('Ambroxol'),
('Guaifenesin'),
('Dextromethorphan'),
('Zinc'),
('Vitamin D3'),
('Calcium Carbonate'),
('Iron Folic Acid'),
('ORS Powder'),
('Benzoyl Peroxide'),
('Clotrimazole'),
('Mupirocin'),
('Povidone Iodine'),
('Loperamide'),
('Ondansetron'),
('Hyoscine Butylbromide'),
('Nitrofurantoin'),
('Doxycycline'),
('Ciprofloxacin'),
('Levofloxacin'),
('Ethinyl Estradiol Levonorgestrel'),
('Thyroxine'),
('Glimepiride'),
('Sitagliptin'),
('Tamsulosin'),
('Finasteride'),
('Budesonide Formoterol'),
('Theophylline'),
('Phenylephrine');

INSERT INTO products (
  product_name, brand, salt_id, strength, dosage_form, packaging,
  stock_unit_label, smallest_unit_label, units_per_stock_unit,
  default_hsn_code, default_gst_rate, product_type
)
SELECT * FROM (
  SELECT 'Brufen 400' AS product_name, 'Abbott' AS brand, (SELECT salt_id FROM salts WHERE salt_name='Ibuprofen') AS salt_id, '400mg' AS strength, 'Tablet' AS dosage_form, '15 tablets/strip' AS packaging, 'strip' AS stock_unit_label, 'tablet' AS smallest_unit_label, 15 AS units_per_stock_unit, '30049099' AS default_hsn_code, 5.00 AS default_gst_rate, 'MEDICINE' AS product_type
  UNION ALL SELECT 'Combiflam', 'Sanofi', (SELECT salt_id FROM salts WHERE salt_name='Ibuprofen'), '400mg+325mg', 'Tablet', '20 tablets/strip', 'strip', 'tablet', 20, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Glycomet 500', 'USV', (SELECT salt_id FROM salts WHERE salt_name='Metformin'), '500mg', 'Tablet', '20 tablets/strip', 'strip', 'tablet', 20, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Glycomet GP1', 'USV', (SELECT salt_id FROM salts WHERE salt_name='Metformin'), '500mg+1mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Atorva 10', 'Zydus', (SELECT salt_id FROM salts WHERE salt_name='Atorvastatin'), '10mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Atorva 20', 'Zydus', (SELECT salt_id FROM salts WHERE salt_name='Atorvastatin'), '20mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Losar 50', 'Unichem', (SELECT salt_id FROM salts WHERE salt_name='Losartan'), '50mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Omez 20', 'Dr Reddy''s', (SELECT salt_id FROM salts WHERE salt_name='Omeprazole'), '20mg', 'Capsule', '15 caps/strip', 'strip', 'capsule', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Domstal', 'Torrent', (SELECT salt_id FROM salts WHERE salt_name='Domperidone'), '10mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Asthalin Inhaler', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Salbutamol'), '100mcg', 'Inhaler', '1 inhaler', 'inhaler', 'dose', 200, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Montair LC', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Montelukast'), '10mg+5mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Voveran SR 75', 'Novartis', (SELECT salt_id FROM salts WHERE salt_name='Diclofenac'), '75mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Volini Gel', 'Sanofi', (SELECT salt_id FROM salts WHERE salt_name='Diclofenac'), '1.16%', 'Gel', '30g tube', 'tube', 'application', 1, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Taxim-O 200', 'Alkem', (SELECT salt_id FROM salts WHERE salt_name='Cefixime'), '200mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30041090', 5, 'MEDICINE'
  UNION ALL SELECT 'Zifi 200', 'FDC', (SELECT salt_id FROM salts WHERE salt_name='Cefixime'), '200mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30041090', 5, 'MEDICINE'
  UNION ALL SELECT 'Levocet M', 'Hetero', (SELECT salt_id FROM salts WHERE salt_name='Levocetirizine'), '5mg+10mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Razo 20', 'Dr Reddy''s', (SELECT salt_id FROM salts WHERE salt_name='Rabeprazole'), '20mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Telma 40', 'Glenmark', (SELECT salt_id FROM salts WHERE salt_name='Telmisartan'), '40mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Amlong 5', 'Micro Labs', (SELECT salt_id FROM salts WHERE salt_name='Amlodipine'), '5mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Telma H', 'Glenmark', (SELECT salt_id FROM salts WHERE salt_name='Hydrochlorothiazide'), '40mg+12.5mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Clopilet 75', 'Sun Pharma', (SELECT salt_id FROM salts WHERE salt_name='Clopidogrel'), '75mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Ecosprin 75', 'USV', (SELECT salt_id FROM salts WHERE salt_name='Aspirin'), '75mg', 'Tablet', '14 tablets/strip', 'strip', 'tablet', 14, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Flagyl 400', 'Abbott', (SELECT salt_id FROM salts WHERE salt_name='Metronidazole'), '400mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Oflox 200', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Ofloxacin'), '200mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30041090', 5, 'MEDICINE'
  UNION ALL SELECT 'Flucos 150', 'FDC', (SELECT salt_id FROM salts WHERE salt_name='Fluconazole'), '150mg', 'Tablet', '1 tablet/strip', 'strip', 'tablet', 1, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Wysolone 5', 'Pfizer', (SELECT salt_id FROM salts WHERE salt_name='Prednisolone'), '5mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Decdan 4', 'Wockhardt', (SELECT salt_id FROM salts WHERE salt_name='Dexamethasone'), '4mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Mucolite Syrup', 'Franco Indian', (SELECT salt_id FROM salts WHERE salt_name='Ambroxol'), '30mg/5ml', 'Syrup', '100ml bottle', 'bottle', 'ml', 100, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Chericof Syrup', 'Sun Pharma', (SELECT salt_id FROM salts WHERE salt_name='Guaifenesin'), '100mg/5ml', 'Syrup', '100ml bottle', 'bottle', 'ml', 100, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Benadryl DR', 'J&J', (SELECT salt_id FROM salts WHERE salt_name='Dextromethorphan'), '15mg/5ml', 'Syrup', '100ml bottle', 'bottle', 'ml', 100, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Zincovit', 'Apex', (SELECT salt_id FROM salts WHERE salt_name='Zinc'), 'Multivitamin', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Calcirol Sachet', 'Cadila', (SELECT salt_id FROM salts WHERE salt_name='Vitamin D3'), '60000 IU', 'Sachet', '1 sachet', 'sachet', 'sachet', 1, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Shelcal 500', 'Torrent', (SELECT salt_id FROM salts WHERE salt_name='Calcium Carbonate'), '500mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Orofer XT', 'Emcure', (SELECT salt_id FROM salts WHERE salt_name='Iron Folic Acid'), '100mg+1.5mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Electral Powder', 'FDC', (SELECT salt_id FROM salts WHERE salt_name='ORS Powder'), 'ORS', 'Powder', '4.4g sachet', 'sachet', 'sachet', 1, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Benzac AC Gel', 'Galderma', (SELECT salt_id FROM salts WHERE salt_name='Benzoyl Peroxide'), '2.5%', 'Gel', '20g tube', 'tube', 'application', 1, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Candid Cream', 'Glenmark', (SELECT salt_id FROM salts WHERE salt_name='Clotrimazole'), '1%', 'Cream', '20g tube', 'tube', 'application', 1, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'T-Bact Ointment', 'GSK', (SELECT salt_id FROM salts WHERE salt_name='Mupirocin'), '2%', 'Ointment', '5g tube', 'tube', 'application', 1, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Betadine Solution', 'Win-Medicare', (SELECT salt_id FROM salts WHERE salt_name='Povidone Iodine'), '5%', 'Solution', '100ml bottle', 'bottle', 'ml', 100, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Eldoper', 'Micro Labs', (SELECT salt_id FROM salts WHERE salt_name='Loperamide'), '2mg', 'Capsule', '10 caps/strip', 'strip', 'capsule', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Emeset 4', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Ondansetron'), '4mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Buscopan', 'Sanofi', (SELECT salt_id FROM salts WHERE salt_name='Hyoscine Butylbromide'), '10mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Macrodantin 100', 'Pfizer', (SELECT salt_id FROM salts WHERE salt_name='Nitrofurantoin'), '100mg', 'Capsule', '10 caps/strip', 'strip', 'capsule', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Doxt-SL', 'Dr Reddy''s', (SELECT salt_id FROM salts WHERE salt_name='Doxycycline'), '100mg', 'Capsule', '10 caps/strip', 'strip', 'capsule', 10, '30041090', 5, 'MEDICINE'
  UNION ALL SELECT 'Ciplox 500', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Ciprofloxacin'), '500mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30041090', 5, 'MEDICINE'
  UNION ALL SELECT 'Levoflox 500', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Levofloxacin'), '500mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30041090', 5, 'MEDICINE'
  UNION ALL SELECT 'i-Pill', 'Piramal', (SELECT salt_id FROM salts WHERE salt_name='Ethinyl Estradiol Levonorgestrel'), '1.5mg', 'Tablet', '1 tablet/strip', 'strip', 'tablet', 1, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Thyronorm 50', 'Abbott', (SELECT salt_id FROM salts WHERE salt_name='Thyroxine'), '50mcg', 'Tablet', '100 tablets/bottle', 'bottle', 'tablet', 100, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Amaryl 1', 'Sanofi', (SELECT salt_id FROM salts WHERE salt_name='Glimepiride'), '1mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Januvia 100', 'MSD', (SELECT salt_id FROM salts WHERE salt_name='Sitagliptin'), '100mg', 'Tablet', '7 tablets/strip', 'strip', 'tablet', 7, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Urimax 0.4', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Tamsulosin'), '0.4mg', 'Capsule', '15 caps/strip', 'strip', 'capsule', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Finax 1', 'Dr Reddy''s', (SELECT salt_id FROM salts WHERE salt_name='Finasteride'), '1mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Foracort 200', 'Cipla', (SELECT salt_id FROM salts WHERE salt_name='Budesonide Formoterol'), '200mcg', 'Inhaler', '1 inhaler', 'inhaler', 'dose', 120, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Deriphyllin', 'Zydus', (SELECT salt_id FROM salts WHERE salt_name='Theophylline'), '150mg', 'Tablet', '30 tablets/bottle', 'bottle', 'tablet', 30, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Sinarest Tablet', 'Centaur', (SELECT salt_id FROM salts WHERE salt_name='Phenylephrine'), 'Combo', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Crocin Advance', 'GSK', (SELECT salt_id FROM salts WHERE salt_name='Paracetamol'), '500mg', 'Tablet', '15 tablets/strip', 'strip', 'tablet', 15, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Sinarest Syrup', 'Centaur', (SELECT salt_id FROM salts WHERE salt_name='Phenylephrine'), 'Combo', 'Syrup', '75ml bottle', 'bottle', 'ml', 75, '30049099', 5, 'OTC'
  UNION ALL SELECT 'Allegra 120', 'Sanofi', (SELECT salt_id FROM salts WHERE salt_name='Levocetirizine'), '120mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30049099', 5, 'MEDICINE'
  UNION ALL SELECT 'Augmentin 625 Duo', 'GSK', (SELECT salt_id FROM salts WHERE salt_name='Amoxicillin'), '625mg', 'Tablet', '10 tablets/strip', 'strip', 'tablet', 10, '30041090', 5, 'MEDICINE'
) AS new_products
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.product_name = new_products.product_name
);

INSERT IGNORE INTO branch_products (branch_id, product_id, low_stock_threshold)
SELECT b.branch_id, p.product_id, 10
FROM branches b
CROSS JOIN products p
LEFT JOIN branch_products bp
  ON bp.branch_id = b.branch_id AND bp.product_id = p.product_id
WHERE bp.product_id IS NULL;

-- Batches + inventory for new products only (per branch)
INSERT INTO batches (branch_id, product_id, batch_number, expiry_date, mrp, purchase_price)
SELECT b.branch_id, p.product_id,
  CONCAT(b.branch_code, '-X', LPAD(p.product_id, 4, '0')),
  DATE_ADD(CURDATE(), INTERVAL (12 + (p.product_id MOD 18)) MONTH),
  ROUND(40 + (p.product_id MOD 50) * 3.5, 2),
  ROUND(28 + (p.product_id MOD 50) * 2.2, 2)
FROM branches b
CROSS JOIN products p
WHERE NOT EXISTS (
  SELECT 1 FROM batches ba
  WHERE ba.branch_id = b.branch_id AND ba.product_id = p.product_id
);

INSERT INTO inventory (branch_id, batch_id, quantity, loose_quantity, selling_price)
SELECT ba.branch_id, ba.batch_id,
  12 + (ba.product_id MOD 25),
  (ba.product_id MOD 8),
  ROUND(ba.mrp * 0.92, 2)
FROM batches ba
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.branch_id = ba.branch_id AND i.batch_id = ba.batch_id
);
