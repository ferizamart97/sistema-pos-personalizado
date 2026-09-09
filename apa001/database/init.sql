-- ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'gerente', 'vendedor');
CREATE TYPE category_type AS ENUM ('dulceria', 'materias_primas', 'regalos');
CREATE TYPE margin_type AS ENUM ('percentage', 'fixed');
CREATE TYPE payment_method AS ENUM ('efectivo', 'tarjeta', 'transferencia');
CREATE TYPE sale_status AS ENUM ('completada', 'cancelada');
CREATE TYPE send_channel AS ENUM ('email', 'whatsapp', 'print', 'none');
CREATE TYPE ticket_status AS ENUM ('generado', 'enviado', 'error');
CREATE TYPE unit_type AS ENUM ('pza', 'kg', 'lt', 'mt');

-- 1. users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'vendedor',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type category_type NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. subcategories
CREATE TABLE subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);

-- 4. products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    description TEXT,
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    margin_type margin_type DEFAULT 'percentage',
    margin_value NUMERIC(10,2) DEFAULT 0,
    sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    unit unit_type DEFAULT 'pza',
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);

-- 5. product_batches
CREATE TABLE product_batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    expiration_date DATE NOT NULL,
    received_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_quantity_sold CHECK (quantity_sold <= quantity)
);
CREATE INDEX idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX idx_product_batches_expiration_date ON product_batches(expiration_date);

-- 6. sales
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    payment_method payment_method DEFAULT 'efectivo',
    status sale_status DEFAULT 'completada',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- 7. sale_details
CREATE TABLE sale_details (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    batch_id INTEGER REFERENCES product_batches(id),
    product_name VARCHAR(200) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sale_details_sale_id ON sale_details(sale_id);
CREATE INDEX idx_sale_details_product_id ON sale_details(product_id);

-- 8. tickets
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL,
    content_html TEXT,
    sent_via send_channel DEFAULT 'none',
    sent_to VARCHAR(200),
    status ticket_status DEFAULT 'generado',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. settings
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key_ VARCHAR(100) UNIQUE NOT NULL,
    value_ TEXT,
    group_ VARCHAR(50),
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. audit_log
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- v_expiration_semaphore VIEW
CREATE VIEW v_expiration_semaphore AS
SELECT 
    p.id as product_id, 
    p.name as product_name, 
    p.sku, 
    pb.id as batch_id, 
    pb.batch_number, 
    pb.expiration_date, 
    (pb.quantity - pb.quantity_sold) as stock_remaining, 
    (pb.expiration_date - CURRENT_DATE) as days_remaining,
    CASE
        WHEN (pb.expiration_date - CURRENT_DATE) <= 30 THEN 'red'
        WHEN (pb.expiration_date - CURRENT_DATE) BETWEEN 31 AND 59 THEN 'orange'
        WHEN (pb.expiration_date - CURRENT_DATE) BETWEEN 60 AND 89 THEN 'yellow'
        ELSE 'green'
    END as semaphore,
    CASE
        WHEN (pb.expiration_date - CURRENT_DATE) <= 30 THEN 'Remates'
        WHEN (pb.expiration_date - CURRENT_DATE) BETWEEN 31 AND 59 THEN 'Promociones'
        WHEN (pb.expiration_date - CURRENT_DATE) BETWEEN 60 AND 89 THEN 'Vigilar y priorizar'
        ELSE 'Venta normal'
    END as semaphore_label
FROM product_batches pb
JOIN products p ON p.id = pb.product_id
WHERE pb.is_active = true AND (pb.quantity - pb.quantity_sold) > 0
ORDER BY pb.expiration_date ASC;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_subcategories_updated_at
BEFORE UPDATE ON subcategories
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_product_batches_updated_at
BEFORE UPDATE ON product_batches
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
