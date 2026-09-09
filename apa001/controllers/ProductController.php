<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/PriceCalculator.php';
require_once __DIR__ . '/../helpers/ImageUploader.php';

use App\middleware\AuthMiddleware;
use App\middleware\RoleMiddleware;
use App\helpers\Response;
use App\helpers\Validator;
use App\helpers\PriceCalculator;
use App\helpers\ImageUploader;
use Database;

/**
 * Controlador de Productos
 * El stock total se calcula sumando los lotes activos
 */
class ProductController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/products - Listar con filtros y stock calculado desde lotes */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 10)));
        $search = $_GET['search'] ?? '';
        $subcategoryId = $_GET['subcategory_id'] ?? '';
        $categoryType = $_GET['category_type'] ?? '';
        $isActive = $_GET['is_active'] ?? '';
        $offset = ($page - 1) * $perPage;

        $where = [];
        $params = [];

        if ($search) {
            $where[] = "(p.name ILIKE :search OR p.sku ILIKE :search OR p.barcode ILIKE :search)";
            $params['search'] = "%{$search}%";
        }
        if ($subcategoryId) { $where[] = "p.subcategory_id = :sub_id"; $params['sub_id'] = $subcategoryId; }
        if ($categoryType) { $where[] = "c.type = :cat_type"; $params['cat_type'] = $categoryType; }
        if ($isActive !== '') { $where[] = "p.is_active = :active"; $params['active'] = $isActive === 'true'; }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM products p
             LEFT JOIN subcategories s ON s.id = p.subcategory_id
             LEFT JOIN categories c ON c.id = s.category_id
             {$whereClause}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT p.*, s.name as subcategory_name, c.name as category_name, c.type as category_type,
                    COALESCE(SUM(pb.quantity - pb.quantity_sold) FILTER (WHERE pb.is_active = true), 0) as total_stock,
                    MIN(pb.expiration_date) FILTER (WHERE pb.is_active = true AND (pb.quantity - pb.quantity_sold) > 0) as nearest_expiration
             FROM products p
             LEFT JOIN subcategories s ON s.id = p.subcategory_id
             LEFT JOIN categories c ON c.id = s.category_id
             LEFT JOIN product_batches pb ON pb.product_id = p.id
             {$whereClause}
             GROUP BY p.id, s.name, c.name, c.type
             ORDER BY p.name ASC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $key => $value) $stmt->bindValue($key, $value);
        $stmt->bindValue('limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $products = $stmt->fetchAll();

        // Añadir semáforo, fracciones y escalas de mayoreo
        if (!empty($products)) {
            $productIds = array_column($products, 'id');
            $inClause = implode(',', array_map('intval', $productIds));

            $tiersStmt = $this->db->query("SELECT * FROM product_wholesale_tiers WHERE product_id IN ({$inClause}) AND is_active = true ORDER BY min_quantity ASC");
            $tiers = $tiersStmt->fetchAll();
            $tiersByProduct = [];
            foreach ($tiers as $t) {
                $tiersByProduct[$t['product_id']][] = $t;
            }

            $fracStmt = $this->db->query("SELECT * FROM product_fraction_prices WHERE product_id IN ({$inClause}) AND is_active = true ORDER BY fraction_multiplier DESC");
            $fracs = $fracStmt->fetchAll();
            $fracsByProduct = [];
            foreach ($fracs as $f) {
                $fracsByProduct[$f['product_id']][] = $f;
            }

            foreach ($products as &$product) {
                $product['semaphore'] = $this->calculateSemaphore($product['nearest_expiration']);
                $product['wholesale_tiers'] = $tiersByProduct[$product['id']] ?? [];
                $product['fractions'] = $fracsByProduct[$product['id']] ?? [];
            }
        }

        Response::paginate($products, $total, $page, $perPage);
    }

    /** GET /api/products/{id} - Detalle con lotes */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare(
            "SELECT p.*, s.name as subcategory_name, s.category_id, c.name as category_name, c.type as category_type
             FROM products p
             LEFT JOIN subcategories s ON s.id = p.subcategory_id
             LEFT JOIN categories c ON c.id = s.category_id
             WHERE p.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch();

        if (!$product) Response::error('Producto no encontrado.', 404);

        // Obtener lotes activos
        $batchStmt = $this->db->prepare(
            "SELECT *, (quantity - quantity_sold) as stock_available,
                    (expiration_date - CURRENT_DATE) as days_remaining
             FROM product_batches 
             WHERE product_id = :id AND is_active = true 
             ORDER BY expiration_date ASC"
        );
        $batchStmt->execute(['id' => $id]);
        $product['batches'] = $batchStmt->fetchAll();

        // Stock total
        $product['total_stock'] = array_sum(array_column($product['batches'], 'stock_available'));

        // Obtener escalas de mayoreo y fracciones
        $tiersStmt = $this->db->prepare("SELECT * FROM product_wholesale_tiers WHERE product_id = :id AND is_active = true ORDER BY min_quantity ASC");
        $tiersStmt->execute(['id' => $id]);
        $product['wholesale_tiers'] = $tiersStmt->fetchAll();

        $fracStmt = $this->db->prepare("SELECT * FROM product_fraction_prices WHERE product_id = :id AND is_active = true ORDER BY fraction_multiplier DESC");
        $fracStmt->execute(['id' => $id]);
        $product['fractions'] = $fracStmt->fetchAll();

        Response::success('Producto encontrado.', $product);
    }

    /** POST /api/products */
    public function store(): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $errors = Validator::validate($data, [
            'name' => 'required|min:2|max:200',
            'sku' => 'required|max:50',
            'purchase_price' => 'required|numeric',
            'margin_type' => 'required|in:percentage,fixed',
            'margin_value' => 'required|numeric',
        ]);
        if (!empty($errors)) Response::error('Datos inválidos.', 422, $errors);

        // Sanitizar subcategory_id
        $subcategoryId = !empty($data['subcategory_id']) ? (int)$data['subcategory_id'] : null;

        // Calcular precio de venta
        $purchasePrice = (float)$data['purchase_price'];
        $marginType = $data['margin_type'];
        $marginValue = (float)$data['margin_value'];
        $salePrice = PriceCalculator::calculate($purchasePrice, $marginType, $marginValue);

        $isBulkEnabled = !empty($data['is_bulk_enabled']);
        $bulkUnit = $data['bulk_unit'] ?? 'kg';
        $bulkPrice = isset($data['bulk_price']) ? (float)$data['bulk_price'] : 0;
        $packageContent = isset($data['package_content']) ? (float)$data['package_content'] : 1.000;
        $bulkStock = isset($data['bulk_stock']) ? (float)$data['bulk_stock'] : 0;

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('
                INSERT INTO products (
                    subcategory_id, name, sku, barcode, description, purchase_price, 
                    margin_type, margin_value, sale_price, min_stock, unit, image_url,
                    is_bulk_enabled, bulk_unit, bulk_price, package_content, bulk_stock
                ) VALUES (
                    :sub_id, :name, :sku, :barcode, :desc, :purchase, 
                    :m_type, :m_value, :sale, :min_stock, :unit, :img,
                    :is_bulk, :bulk_unit, :bulk_price, :pkg_content, :bulk_stock
                ) RETURNING id
            ');
            $stmt->execute([
                'sub_id' => $subcategoryId,
                'name' => trim($data['name']),
                'sku' => trim($data['sku']),
                'barcode' => !empty($data['barcode']) ? trim($data['barcode']) : null,
                'desc' => $data['description'] ?? null,
                'purchase' => $purchasePrice,
                'm_type' => $marginType,
                'm_value' => $marginValue,
                'sale' => $salePrice,
                'min_stock' => (int)($data['min_stock'] ?? 0),
                'unit' => $data['unit'] ?? 'pza',
                'img' => $data['image_url'] ?? null,
                'is_bulk' => $isBulkEnabled ? 'true' : 'false',
                'bulk_unit' => $bulkUnit,
                'bulk_price' => $bulkPrice,
                'pkg_content' => $packageContent,
                'bulk_stock' => $bulkStock,
            ]);

            $productId = (int)$stmt->fetchColumn();

            // Si se especificó un stock inicial > 0, crear el lote inicial automáticamente
            $initialStock = isset($data['initial_stock']) ? (int)$data['initial_stock'] : 0;
            if ($initialStock > 0) {
                $year = date('Y');
                $countStmt = $this->db->prepare("SELECT COUNT(*) FROM product_batches WHERE batch_number LIKE :pattern");
                $countStmt->execute(['pattern' => "L-{$year}-%"]);
                $count = (int)$countStmt->fetchColumn() + 1;
                $batchNumber = sprintf("L-%s-%03d", $year, $count);

                $expDate = !empty($data['expiration_date']) 
                    ? $data['expiration_date'] 
                    : date('Y-m-d', strtotime('+90 days'));

                $batchStmt = $this->db->prepare('
                    INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date, received_date, notes)
                    VALUES (:pid, :batch, :qty, :exp, CURRENT_DATE, :notes)
                ');
                $batchStmt->execute([
                    'pid' => $productId,
                    'batch' => $batchNumber,
                    'qty' => $initialStock,
                    'exp' => $expDate,
                    'notes' => 'Lote inicial registrado al crear producto'
                ]);
            }

            $this->db->commit();
            Response::success('Producto creado exitosamente.', [
                'id' => $productId, 
                'sale_price' => $salePrice,
                'initial_stock' => $initialStock
            ], 201);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error al crear el producto: ' . $e->getMessage(), 500);
        }
    }

    /** PUT /api/products/{id} */
    public function update(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        // Obtener producto actual para recalcular precio si cambia margen
        $current = $this->db->prepare('SELECT * FROM products WHERE id = :id');
        $current->execute(['id' => $id]);
        $product = $current->fetch();
        if (!$product) Response::error('Producto no encontrado.', 404);

        $fields = [];
        $params = ['id' => $id];

        if (array_key_exists('name', $data) && $data['name'] !== '') {
            $fields[] = 'name = :name';
            $params['name'] = trim($data['name']);
        }
        if (array_key_exists('subcategory_id', $data)) {
            $fields[] = 'subcategory_id = :sub_id';
            $params['sub_id'] = !empty($data['subcategory_id']) ? (int)$data['subcategory_id'] : null;
        }
        if (array_key_exists('sku', $data) && $data['sku'] !== '') {
            $fields[] = 'sku = :sku';
            $params['sku'] = trim($data['sku']);
        }
        if (array_key_exists('barcode', $data)) {
            $fields[] = 'barcode = :barcode';
            $params['barcode'] = !empty($data['barcode']) ? trim($data['barcode']) : null;
        }
        if (array_key_exists('description', $data)) {
            $fields[] = 'description = :desc';
            $params['desc'] = $data['description'] ?: null;
        }
        if (array_key_exists('min_stock', $data)) {
            $fields[] = 'min_stock = :min_stock';
            $params['min_stock'] = (int)$data['min_stock'];
        }
        if (array_key_exists('unit', $data) && $data['unit'] !== '') {
            $fields[] = 'unit = :unit';
            $params['unit'] = $data['unit'];
        }
        if (array_key_exists('image_url', $data)) {
            $fields[] = 'image_url = :img';
            $params['img'] = $data['image_url'] ?: null;
        }
        if (array_key_exists('is_bulk_enabled', $data)) {
            $fields[] = 'is_bulk_enabled = :is_bulk';
            $params['is_bulk'] = filter_var($data['is_bulk_enabled'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        }
        if (array_key_exists('bulk_unit', $data)) {
            $fields[] = 'bulk_unit = :bulk_unit';
            $params['bulk_unit'] = $data['bulk_unit'] ?: 'kg';
        }
        if (array_key_exists('bulk_price', $data)) {
            $fields[] = 'bulk_price = :bulk_price';
            $params['bulk_price'] = (float)$data['bulk_price'];
        }
        if (array_key_exists('package_content', $data)) {
            $fields[] = 'package_content = :pkg_content';
            $params['pkg_content'] = (float)$data['package_content'];
        }
        if (array_key_exists('bulk_stock', $data)) {
            $fields[] = 'bulk_stock = :bulk_stock';
            $params['bulk_stock'] = (float)$data['bulk_stock'];
        }

        // Recalcular precio si se cambia precio de compra o margen
        $hasPriceChange = isset($data['purchase_price']) || isset($data['margin_type']) || isset($data['margin_value']);
        if ($hasPriceChange) {
            $purchasePrice = isset($data['purchase_price']) && $data['purchase_price'] !== '' 
                ? (float)$data['purchase_price'] 
                : (float)$product['purchase_price'];
            $marginType = !empty($data['margin_type']) 
                ? $data['margin_type'] 
                : $product['margin_type'];
            $marginValue = isset($data['margin_value']) && $data['margin_value'] !== '' 
                ? (float)$data['margin_value'] 
                : (float)$product['margin_value'];

            $salePrice = PriceCalculator::calculate($purchasePrice, $marginType, $marginValue);
            $fields[] = 'purchase_price = :purchase'; $params['purchase'] = $purchasePrice;
            $fields[] = 'margin_type = :m_type'; $params['m_type'] = $marginType;
            $fields[] = 'margin_value = :m_value'; $params['m_value'] = $marginValue;
            $fields[] = 'sale_price = :sale'; $params['sale'] = $salePrice;
        }

        if (empty($fields)) Response::error('No se proporcionaron datos para actualizar.', 400);

        $stmt = $this->db->prepare('UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($params);
        Response::success('Producto actualizado exitosamente.');
    }

    /** PATCH /api/products/{id}/toggle */
    public function toggle(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $stmt = $this->db->prepare('UPDATE products SET is_active = NOT is_active WHERE id = :id RETURNING is_active');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        if (!$result) Response::error('Producto no encontrado.', 404);
        Response::success('Estado actualizado.', ['is_active' => $result['is_active']]);
    }

    /** DELETE /api/products/{id} */
    public function destroy(string $id): void
    {
        RoleMiddleware::authorize(['admin']);
        $this->db->prepare('DELETE FROM products WHERE id = :id')->execute(['id' => $id]);
        Response::success('Producto eliminado permanentemente.');
    }

    /** POST /api/products/{id}/photo */
    public function uploadPhoto(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);

        if (empty($_FILES['photo'])) Response::error('No se envió ninguna imagen.', 400);

        try {
            $path = ImageUploader::upload($_FILES['photo']);
            $this->db->prepare('UPDATE products SET image_url = :img WHERE id = :id')
                ->execute(['img' => $path, 'id' => $id]);
            Response::success('Foto actualizada.', ['image_url' => $path]);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /** POST /api/products/bulk-import */
    public function bulkImport(): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $items = $data['products'] ?? [];

        if (empty($items) || !is_array($items)) {
            Response::error('No se proporcionaron productos para importar.', 422);
        }

        $imported = 0;
        $errors = [];

        $this->db->beginTransaction();
        try {
            foreach ($items as $idx => $item) {
                $rowNum = $idx + 1;
                $sku = trim($item['sku'] ?? '');
                $name = trim($item['name'] ?? '');
                $purchasePrice = (float)($item['purchase_price'] ?? 0);
                $marginType = in_array($item['margin_type'] ?? '', ['percentage', 'fixed']) ? $item['margin_type'] : 'percentage';
                $marginValue = (float)($item['margin_value'] ?? 30);
                $isBulk = !empty($item['is_bulk_enabled']) && ($item['is_bulk_enabled'] === true || strtolower($item['is_bulk_enabled']) === 'si' || strtolower($item['is_bulk_enabled']) === 'sí');

                if (empty($sku) || empty($name) || $purchasePrice <= 0) {
                    $errors[] = "Fila #{$rowNum}: SKU, Nombre y Precio de Compra son obligatorios.";
                    continue;
                }

                // Check if SKU exists
                $checkStmt = $this->db->prepare('SELECT id FROM products WHERE sku = :sku');
                $checkStmt->execute(['sku' => $sku]);
                $existingId = $checkStmt->fetchColumn();

                // Calculate sale price
                $salePrice = ($marginType === 'percentage')
                    ? $purchasePrice * (1 + ($marginValue / 100))
                    : $purchasePrice + $marginValue;
                $bulkPrice = $isBulk ? ($salePrice * 1.20) : null;

                // Subcategory resolution if provided
                $subcategoryId = null;
                if (!empty($item['subcategory_name'])) {
                    $subStmt = $this->db->prepare('SELECT id FROM subcategories WHERE LOWER(name) = LOWER(:name) LIMIT 1');
                    $subStmt->execute(['name' => trim($item['subcategory_name'])]);
                    $subcategoryId = $subStmt->fetchColumn() ?: null;
                }

                if ($existingId) {
                    // Update existing
                    $updateStmt = $this->db->prepare('
                        UPDATE products 
                        SET name = :name, purchase_price = :pprice, margin_type = :mtype,
                            margin_value = :mval, sale_price = :sprice, is_bulk_enabled = :is_bulk,
                            bulk_price = :bulk_price, subcategory_id = COALESCE(:sub_id, subcategory_id)
                        WHERE id = :id
                    ');
                    $updateStmt->execute([
                        'name' => $name,
                        'pprice' => $purchasePrice,
                        'mtype' => $marginType,
                        'mval' => $marginValue,
                        'sprice' => $salePrice,
                        'is_bulk' => $isBulk ? 'true' : 'false',
                        'bulk_price' => $bulkPrice,
                        'sub_id' => $subcategoryId,
                        'id' => $existingId
                    ]);
                    $productId = $existingId;
                } else {
                    // Insert new
                    $insertStmt = $this->db->prepare('
                        INSERT INTO products (
                            name, sku, barcode, subcategory_id, purchase_price, margin_type,
                            margin_value, sale_price, is_bulk_enabled, bulk_price, min_stock, unit, is_active
                        ) VALUES (
                            :name, :sku, :barcode, :sub_id, :pprice, :mtype,
                            :mval, :sprice, :is_bulk, :bulk_price, :min_stock, :unit, true
                        ) RETURNING id
                    ');
                    $insertStmt->execute([
                        'name' => $name,
                        'sku' => $sku,
                        'barcode' => !empty($item['barcode']) ? trim($item['barcode']) : null,
                        'sub_id' => $subcategoryId,
                        'pprice' => $purchasePrice,
                        'mtype' => $marginType,
                        'mval' => $marginValue,
                        'sprice' => $salePrice,
                        'is_bulk' => $isBulk ? 'true' : 'false',
                        'bulk_price' => $bulkPrice,
                        'min_stock' => (float)($item['min_stock'] ?? 5),
                        'unit' => !empty($item['unit']) ? trim($item['unit']) : ($isBulk ? 'kg' : 'pza')
                    ]);
                    $productId = $insertStmt->fetchColumn();
                }

                // If initial stock provided, insert batch
                $initialStock = (float)($item['initial_stock'] ?? 0);
                if ($initialStock > 0 && $productId) {
                    $daysExp = !empty($item['expiration_days']) ? (int)$item['expiration_days'] : 180;
                    $expDate = date('Y-m-d', strtotime("+{$daysExp} days"));
                    $batchNumber = 'LOT-IMP-' . date('Ymd') . '-' . substr(md5($sku . microtime()), 0, 4);

                    $batchStmt = $this->db->prepare('
                        INSERT INTO product_batches (product_id, batch_number, expiration_date, quantity, purchase_price, is_active)
                        VALUES (:pid, :bnum, :edate, :qty, :pprice, true)
                    ');
                    $batchStmt->execute([
                        'pid' => $productId,
                        'bnum' => strtoupper($batchNumber),
                        'edate' => $expDate,
                        'qty' => $initialStock,
                        'pprice' => $purchasePrice
                    ]);
                }

                $imported++;
            }

            $this->db->commit();
            Response::success("Carga masiva completada: {$imported} productos procesados.", [
                'imported_count' => $imported,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error durante la importación: ' . $e->getMessage(), 500);
        }
    }

    private function calculateSemaphore(?string $expirationDate): array
    {
        if (!$expirationDate) return ['color' => 'gray', 'label' => 'Sin caducidad', 'days' => null];

        $days = (int)((new \DateTime($expirationDate))->diff(new \DateTime())->format('%r%a'));
        $daysRemaining = -$days; // Invertir signo

        if ($daysRemaining <= 0) return ['color' => 'black', 'label' => 'Caducado', 'days' => $daysRemaining];
        if ($daysRemaining <= 30) return ['color' => 'red', 'label' => 'Remates', 'days' => $daysRemaining];
        if ($daysRemaining <= 59) return ['color' => 'orange', 'label' => 'Promociones', 'days' => $daysRemaining];
        if ($daysRemaining <= 89) return ['color' => 'yellow', 'label' => 'Vigilar y priorizar', 'days' => $daysRemaining];
        return ['color' => 'green', 'label' => 'Venta normal', 'days' => $daysRemaining];
    }
}
