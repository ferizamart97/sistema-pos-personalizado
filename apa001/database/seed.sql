-- Seed file para la base de datos de Sistema POS

-- 1. Insert Users
INSERT INTO users (name, email, password, role) VALUES 
('Administrador Principal', 'admin@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Gerente General', 'gerente@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'gerente'),
('Vendedor 1', 'vendedor1@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor');

-- 2. Insert Categories
INSERT INTO categories (name, slug, type, description) VALUES
('Dulcería', 'dulceria', 'dulceria', 'Todo tipo de dulces, chicles, y chocolates'),
('Materias Primas', 'materias-primas', 'materias_primas', 'Insumos para repostería y fiestas'),
('Regalos', 'regalos', 'regalos', 'Artículos para regalos y envolturas');

-- 3. Insert Subcategories
-- Dulcería (category_id = 1)
INSERT INTO subcategories (category_id, name, slug, description) VALUES
(1, 'Chicles', 'dulceria-chicles', 'Chicles de diferentes marcas y sabores'),
(1, 'Chocolates', 'dulceria-chocolates', 'Chocolates en barra, confitados y más'),
(1, 'Paletas', 'dulceria-paletas', 'Paletas de caramelo macizo y rellenas'),
(1, 'Gomitas', 'dulceria-gomitas', 'Gomitas dulces y enchiladas'),
(1, 'Dulces Enchilados', 'dulceria-enchilados', 'Dulces con chile y chamoy'),
(1, 'Galletas', 'dulceria-galletas', 'Galletas dulces y saladas');

-- Materias Primas (category_id = 2)
INSERT INTO subcategories (category_id, name, slug, description) VALUES
(2, 'Harinas', 'materias-harinas', 'Harinas de trigo, maíz y preparadas'),
(2, 'Azúcares', 'materias-azucares', 'Azúcar estándar, refinada, glass'),
(2, 'Colorantes', 'materias-colorantes', 'Colorantes vegetales en gel y líquidos'),
(2, 'Esencias', 'materias-esencias', 'Saborizantes y esencias artificiales'),
(2, 'Moldes', 'materias-moldes', 'Moldes para gelatinas y pasteles'),
(2, 'Empaques', 'materias-empaques', 'Cajas, domos y bolsas para repostería');

-- Regalos (category_id = 3)
INSERT INTO subcategories (category_id, name, slug, description) VALUES
(3, 'Tazas', 'regalos-tazas', 'Tazas decoradas y lisas'),
(3, 'Termos', 'regalos-termos', 'Termos para café y agua'),
(3, 'Bolsas de Regalo', 'regalos-bolsas', 'Bolsas de papel y celofán para regalo'),
(3, 'Peluches', 'regalos-peluches', 'Peluches de diferentes tamaños'),
(3, 'Globos', 'regalos-globos', 'Globos de látex y metálicos'),
(3, 'Velas', 'regalos-velas', 'Velas de cumpleaños y decorativas');

-- 4. Insert Products
-- Productos de Chicles (subcategory_id = 1)
INSERT INTO products (subcategory_id, name, sku, barcode, purchase_price, margin_type, margin_value, sale_price, min_stock) VALUES
(1, 'Trident Menta', 'CHI-TRI-MEN', '7501234567890', 12.00, 'percentage', 30.00, 15.60, 20),
(1, 'Bubbaloo Fresa', 'CHI-BUB-FRE', '7501234567891', 8.00, 'percentage', 25.00, 10.00, 30),
(1, 'Clorets', 'CHI-CLO-REG', '7501234567892', 10.00, 'percentage', 20.00, 12.00, 15);

-- Productos de Chocolates (subcategory_id = 2)
INSERT INTO products (subcategory_id, name, sku, barcode, purchase_price, margin_type, margin_value, sale_price, min_stock) VALUES
(2, 'Carlos V', 'CHO-CAR-REG', '7501234567893', 15.00, 'percentage', 30.00, 19.50, 20),
(2, 'Snickers', 'CHO-SNI-REG', '7501234567894', 22.00, 'percentage', 25.00, 27.50, 15),
(2, 'Ferrero Rocher 3pz', 'CHO-FER-3PZ', '7501234567895', 45.00, 'percentage', 20.00, 54.00, 10);

-- Productos de Tazas (subcategory_id = 13)
INSERT INTO products (subcategory_id, name, sku, barcode, purchase_price, margin_type, margin_value, sale_price, min_stock) VALUES
(13, 'Taza Personalizada', 'REG-TAZ-PER', '7501234567896', 35.00, 'fixed', 25.00, 60.00, 5),
(13, 'Taza Térmica', 'REG-TAZ-TER', '7501234567897', 80.00, 'fixed', 40.00, 120.00, 5),
(13, 'Taza de Cerámica Básica', 'REG-TAZ-BAS', '7501234567898', 25.00, 'percentage', 50.00, 37.50, 10);

-- 5. Insert Product Batches
-- Para Trident Menta (product_id = 1)
INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date) VALUES
(1, 'LOTE-TRIM-01', 50, CURRENT_DATE + INTERVAL '20 days'), -- Rojo
(1, 'LOTE-TRIM-02', 100, CURRENT_DATE + INTERVAL '45 days'), -- Naranja
(1, 'LOTE-TRIM-03', 100, CURRENT_DATE + INTERVAL '120 days'); -- Verde

-- Para Bubbaloo Fresa (product_id = 2)
INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date) VALUES
(2, 'LOTE-BUB-01', 80, CURRENT_DATE + INTERVAL '75 days'), -- Amarillo
(2, 'LOTE-BUB-02', 150, CURRENT_DATE + INTERVAL '150 days'); -- Verde

-- Para Clorets (product_id = 3)
INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date) VALUES
(3, 'LOTE-CLO-01', 30, CURRENT_DATE + INTERVAL '10 days'), -- Rojo
(3, 'LOTE-CLO-02', 80, CURRENT_DATE + INTERVAL '40 days'); -- Naranja

-- Para Carlos V (product_id = 4)
INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date) VALUES
(4, 'LOTE-CAR-01', 40, CURRENT_DATE + INTERVAL '25 days'), -- Rojo
(4, 'LOTE-CAR-02', 60, CURRENT_DATE + INTERVAL '70 days'); -- Amarillo

-- Para Snickers (product_id = 5)
INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date) VALUES
(5, 'LOTE-SNI-01', 25, CURRENT_DATE + INTERVAL '50 days'), -- Naranja
(5, 'LOTE-SNI-02', 50, CURRENT_DATE + INTERVAL '90 days'); -- Verde

-- Para Ferrero (product_id = 6)
INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date) VALUES
(6, 'LOTE-FER-01', 15, CURRENT_DATE + INTERVAL '15 days'), -- Rojo
(6, 'LOTE-FER-02', 30, CURRENT_DATE + INTERVAL '80 days'); -- Amarillo

-- Para Tazas (Productos 7, 8, 9)
-- Los regalos no suelen tener fecha de caducidad corta, los ponemos lejos
INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date) VALUES
(7, 'LOTE-TAZPER-01', 20, CURRENT_DATE + INTERVAL '730 days'), 
(8, 'LOTE-TAZTER-01', 15, CURRENT_DATE + INTERVAL '730 days'),
(9, 'LOTE-TAZBAS-01', 30, CURRENT_DATE + INTERVAL '730 days');

-- 6. Insert Settings
INSERT INTO settings (key_, value_, group_, description) VALUES
('business_name', 'Mi Tienda', 'general', 'Nombre del negocio'),
('business_address', 'Calle Principal #123, Ciudad', 'general', 'Dirección del negocio'),
('business_phone', '555-123-4567', 'general', 'Teléfono de contacto'),
('business_email', 'contacto@mitienda.com', 'general', 'Correo de contacto'),
('tax_rate', '16', 'financial', 'Tasa de impuesto (IVA)'),
('ticket_footer', 'Gracias por su compra', 'receipt', 'Mensaje al pie del ticket'),
('currency', 'MXN', 'financial', 'Moneda principal');
