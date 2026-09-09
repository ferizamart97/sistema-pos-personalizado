-- ==========================================================
-- Migración: Actualizaciones y Nuevas Funcionalidades
-- Granel, Mayoreo, Paquetes Piñateros, Servicios, Pedidos y Apartados
-- ==========================================================

-- 1. Nuevos tipos ENUM
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado_reembolso', 'cancelado_cambio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE layaway_status AS ENUM ('activo', 'liquidado', 'vencido', 'gracia_10_dias', 'cancelado', 'entregado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_price_type AS ENUM ('fijo', 'variable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sale_item_type AS ENUM ('producto', 'granel', 'fraccion', 'paquete', 'servicio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Modificaciones a la tabla products para venta a granel
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_bulk_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bulk_unit VARCHAR(20) DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS bulk_price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS package_content NUMERIC(10,3) DEFAULT 1.000, -- Cantidad de gramos/kilos que rinde una bolsa cerrada
ADD COLUMN IF NOT EXISTS bulk_stock NUMERIC(10,3) DEFAULT 0;       -- Stock abierto actual disponible a granel

-- 3. Tabla de Fraccionamiento de Precios (Kilo, Medio, Cuarto, Pieza Suelta)
CREATE TABLE IF NOT EXISTS product_fraction_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- '1 Kilo', '1/2 Kilo', '1/4 Kilo', 'Pieza Suelta', '100g'
    fraction_multiplier NUMERIC(10,3) NOT NULL, -- 1.000, 0.500, 0.250, 0.100
    price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fraction_prices_product_id ON product_fraction_prices(product_id);

-- 4. Tabla de Precios de Mayoreo por Volumen
CREATE TABLE IF NOT EXISTS product_wholesale_tiers (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    min_quantity NUMERIC(10,2) NOT NULL, -- Ej: a partir de 6 o 12 pzas / kg
    wholesale_price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wholesale_tiers_product_id ON product_wholesale_tiers(product_id);

-- 5. Paquetes y Combos Piñateros (20 personas, 50 personas, etc.)
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    capacity_people INTEGER DEFAULT 20, -- 20, 50, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'pza'
);
CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id);

-- 6. Catálogo de Servicios (Helio, Envolturas, etc.)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general', -- 'globos_helio', 'envolturas', 'impresion_transfer', 'otro'
    price_type service_price_type DEFAULT 'variable',
    base_price NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Pedidos Especiales (Obleas, Transfer para pastel, arreglos personalizados)
CREATE TABLE IF NOT EXISTS custom_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(150),
    description TEXT NOT NULL,
    required_date TIMESTAMP NOT NULL, -- Fecha y hora en la que se necesita
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0, -- Anticipo / Garantía
    pending_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    status order_status DEFAULT 'pendiente',
    cancellation_reason TEXT,
    refund_type VARCHAR(50), -- 'efectivo', 'cambio_producto'
    refund_amount NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_orders_required_date ON custom_orders(required_date);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON custom_orders(status);

-- 8. Sistema de Apartados (Layaway)
CREATE TABLE IF NOT EXISTS layaways (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(150),
    total_amount NUMERIC(10,2) NOT NULL,
    initial_deposit NUMERIC(10,2) NOT NULL, -- Min 25%
    total_paid NUMERIC(10,2) NOT NULL,
    remaining_balance NUMERIC(10,2) NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE NOT NULL, -- start_date + 30 días
    grace_period_end_date DATE NOT NULL, -- expiration_date + 10 días
    status layaway_status DEFAULT 'activo',
    admin_contacted BOOLEAN DEFAULT false,
    admin_contacted_at TIMESTAMP,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_layaways_status ON layaways(status);
CREATE INDEX IF NOT EXISTS idx_layaways_expiration ON layaways(expiration_date);

-- Productos incluidos en el apartado
CREATE TABLE IF NOT EXISTS layaway_items (
    id SERIAL PRIMARY KEY,
    layaway_id INTEGER REFERENCES layaways(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_layaway_items_layaway_id ON layaway_items(layaway_id);

-- Historial de Abonos a los Apartados
CREATE TABLE IF NOT EXISTS layaway_payments (
    id SERIAL PRIMARY KEY,
    layaway_id INTEGER REFERENCES layaways(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method payment_method DEFAULT 'efectivo',
    previous_balance NUMERIC(10,2) NOT NULL,
    new_balance NUMERIC(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_layaway_payments_layaway_id ON layaway_payments(layaway_id);

-- 9. Actualización a sale_details para soportar tipo de item
ALTER TABLE sale_details
ADD COLUMN IF NOT EXISTS item_type sale_item_type DEFAULT 'producto',
ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
ALTER COLUMN quantity TYPE NUMERIC(10,3);

-- 10. Triggers de actualización de updated_at para nuevas tablas
CREATE OR REPLACE TRIGGER tr_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER tr_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER tr_custom_orders_updated_at BEFORE UPDATE ON custom_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER tr_layaways_updated_at BEFORE UPDATE ON layaways FOR EACH ROW EXECUTE FUNCTION update_updated_at();
