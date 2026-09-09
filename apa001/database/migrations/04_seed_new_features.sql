-- Seed data para las nuevas funcionalidades

-- 1. Habilitar venta a granel en productos existentes
-- Gomitas (product_id = 1 o nombre Gomitas)
UPDATE products 
SET is_bulk_enabled = true, 
    bulk_unit = 'kg', 
    bulk_price = 120.00, 
    package_content = 1.000, 
    bulk_stock = 0.750 
WHERE id = 1;

-- 2. Fraccionamiento de Precios para Bolsas de Basura y Materias Primas
-- Insertar un producto de Bolsas de Basura si no existe
INSERT INTO products (subcategory_id, name, sku, barcode, purchase_price, margin_type, margin_value, sale_price, min_stock, is_bulk_enabled, bulk_unit, bulk_price, package_content, bulk_stock) 
VALUES (12, 'Bolsa de Basura Negra Calibre Pesado', 'MAT-BOL-BAS', '750999900001', 30.00, 'percentage', 50.00, 45.00, 10, true, 'kg', 45.00, 1.000, 0.500)
ON CONFLICT (sku) DO UPDATE SET is_bulk_enabled = true, bulk_price = 45.00;

-- Escala de Fracciones para la Bolsa de Basura (id = (SELECT id FROM products WHERE sku = 'MAT-BOL-BAS'))
INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, '1 Kilo Completo', 1.000, 45.00 FROM products WHERE sku = 'MAT-BOL-BAS'
ON CONFLICT DO NOTHING;

INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, '1/2 Kilo (500g)', 0.500, 25.00 FROM products WHERE sku = 'MAT-BOL-BAS'
ON CONFLICT DO NOTHING;

INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, '1/4 Kilo (250g)', 0.250, 14.00 FROM products WHERE sku = 'MAT-BOL-BAS'
ON CONFLICT DO NOTHING;

INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, 'Pieza Suelta', 0.050, 4.00 FROM products WHERE sku = 'MAT-BOL-BAS'
ON CONFLICT DO NOTHING;

-- 3. Escala de Mayoreo por Volumen
-- Carlos V (sku = 'CHO-CAR-REG'): Menudeo $19.50, Mayoreo a partir de 12 pzas $16.50
INSERT INTO product_wholesale_tiers (product_id, min_quantity, wholesale_price)
SELECT id, 12, 16.50 FROM products WHERE sku = 'CHO-CAR-REG'
ON CONFLICT DO NOTHING;

-- Trident Menta (sku = 'CHI-TRI-MEN'): Menudeo $15.60, Mayoreo a partir de 10 pzas $13.00
INSERT INTO product_wholesale_tiers (product_id, min_quantity, wholesale_price)
SELECT id, 10, 13.00 FROM products WHERE sku = 'CHI-TRI-MEN'
ON CONFLICT DO NOTHING;

-- 4. Paquetes Piñateros / Combos
INSERT INTO packages (name, sku, description, price, capacity_people)
VALUES 
('Paquete Piñatero Fiesta 20 Personas', 'PAQ-PIN-20P', 'Combo surtido con dulces, chocolates, chicles y bolsas para 20 niños', 299.00, 20),
('Paquete Piñatero Mega Fiesta 50 Personas', 'PAQ-PIN-50P', 'Super paquete con surtido completo de dulcería y desechables para 50 personas', 649.00, 50)
ON CONFLICT (sku) DO NOTHING;

-- Componentes del paquete de 20 personas
INSERT INTO package_items (package_id, product_id, quantity, unit)
SELECT p.id, pr.id, 20, 'pza' FROM packages p, products pr 
WHERE p.sku = 'PAQ-PIN-20P' AND pr.sku = 'CHI-TRI-MEN'
ON CONFLICT DO NOTHING;

INSERT INTO package_items (package_id, product_id, quantity, unit)
SELECT p.id, pr.id, 20, 'pza' FROM packages p, products pr 
WHERE p.sku = 'PAQ-PIN-20P' AND pr.sku = 'CHO-CAR-REG'
ON CONFLICT DO NOTHING;

-- 5. Catálogo de Servicios
INSERT INTO services (name, description, category, price_type, base_price)
VALUES
('Inflado de Globo con Gas Helio', 'Llenado con helio puro de alta duración, incluye listón', 'globos_helio', 'variable', 25.00),
('Envoltura de Regalo Personalizada', 'Papel temático, moño artesanal y tarjeta dedicatoria', 'envolturas', 'variable', 35.00),
('Impresión de Oblea Comestible / Transfer Pastel', 'Impresión digital en papel de arroz o transfer con tinta vegetal comestible', 'impresion_transfer', 'fijo', 65.00),
('Personalización de Taza o Termo con Vinil', 'Rotulación personalizada con nombre o diseño a elección', 'otro', 'variable', 50.00)
ON CONFLICT DO NOTHING;

-- 6. Pedidos Especiales Demo
INSERT INTO custom_orders (order_number, user_id, customer_name, customer_phone, customer_email, description, required_date, total, deposit_amount, pending_balance, status)
VALUES
('PED-20260830-001', 1, 'María Elena Pérez', '5512345678', 'maria.perez@gmail.com', 'Oblea transfer comestible tamaño carta diseño Paw Patrol con nombre "Mateo - 4 Años"', CURRENT_TIMESTAMP + INTERVAL '2 days', 130.00, 65.00, 65.00, 'pendiente'),
('PED-20260830-002', 1, 'Carlos Mendoza', '5598765432', 'carlos.mendoza@hotmail.com', 'Arreglo de 10 globos con helio temática Graduación con base de chocolates', CURRENT_TIMESTAMP + INTERVAL '1 day', 450.00, 200.00, 250.00, 'en_proceso')
ON CONFLICT (order_number) DO NOTHING;

-- 7. Apartados (Layaways) Demo
INSERT INTO layaways (folio, user_id, customer_name, customer_phone, customer_email, total_amount, initial_deposit, total_paid, remaining_balance, start_date, expiration_date, grace_period_end_date, status)
VALUES
('APT-20260830-001', 1, 'Lucía Gómez', '5544332211', 'lucia.gomez@gmail.com', 480.00, 150.00, 150.00, 330.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '40 days', 'activo')
ON CONFLICT (folio) DO NOTHING;

INSERT INTO layaway_items (layaway_id, product_id, product_name, quantity, unit_price, subtotal)
SELECT l.id, p.id, p.name, 4, p.sale_price, 4 * p.sale_price 
FROM layaways l, products p 
WHERE l.folio = 'APT-20260830-001' AND p.sku = 'REG-TAZ-TER'
LIMIT 1;

INSERT INTO layaway_payments (layaway_id, user_id, receipt_number, amount, payment_method, previous_balance, new_balance, notes)
SELECT id, user_id, 'ABN-20260830-001', 150.00, 'efectivo', 480.00, 330.00, 'Anticipo inicial del 31.25% para apartado'
FROM layaways WHERE folio = 'APT-20260830-001';
