<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/BulkInventoryHelper.php';

use App\middleware\AuthMiddleware;
use App\helpers\Response;
use App\helpers\BulkInventoryHelper;
use Database;

/**
 * Controlador de Ventas Avanzado
 * Soporta:
 * 1. Productos empaquetados con deducción FIFO de lotes y precio de mayoreo automático
 * 2. Venta a granel con deducción de bulk_stock y apertura automática de bolsas
 * 3. Fraccionamiento de productos (1kg, 1/2kg, 1/4kg, suelta)
 * 4. Paquetes/Combos Piñateros con descuento automático de todos sus componentes
 * 5. Catálogo de Servicios con precio fijo o variable
 */
class SaleController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** POST /api/sales - Registrar venta */
    public function store(): void
    {
        $authUser = AuthMiddleware::authenticate();
        $userId = is_array($authUser) ? $authUser['user_id'] : ($authUser->user_id ?? 1);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['items']) || !is_array($data['items'])) {
            Response::error('Debe incluir al menos un producto, servicio o paquete.', 422);
        }

        $this->db->beginTransaction();

        try {
            // Generar número de ticket: T-YYYYMMDD-NNN
            $today = date('Ymd');
            $countStmt = $this->db->prepare("SELECT COUNT(*) FROM sales WHERE ticket_number LIKE :pattern");
            $countStmt->execute(['pattern' => "T-{$today}-%"]);
            $count = (int)$countStmt->fetchColumn() + 1;
            $ticketNumber = sprintf("T-%s-%03d", $today, $count);

            $subtotal = 0;
            $saleDetails = [];

            foreach ($data['items'] as $item) {
                $itemType = $item['item_type'] ?? 'producto'; // 'producto', 'granel', 'fraccion', 'paquete', 'servicio'
                $quantity = (float)($item['quantity'] ?? 1);

                if ($quantity <= 0) {
                    throw new \RuntimeException("La cantidad debe ser mayor a 0.");
                }

                switch ($itemType) {
                    case 'servicio':
                        $serviceId = (int)$item['service_id'];
                        $servStmt = $this->db->prepare('SELECT * FROM services WHERE id = :id AND is_active = true');
                        $servStmt->execute(['id' => $serviceId]);
                        $service = $servStmt->fetch();

                        if (!$service) {
                            throw new \RuntimeException("Servicio ID {$serviceId} no encontrado o inactivo.");
                        }

                        // Permitir precio personalizado si es variable o si se especificó
                        $unitPrice = isset($item['unit_price']) ? (float)$item['unit_price'] : (float)$service['base_price'];
                        $itemSubtotal = round($unitPrice * $quantity, 2);
                        $subtotal += $itemSubtotal;

                        $saleDetails[] = [
                            'item_type' => 'servicio',
                            'service_id' => $serviceId,
                            'product_id' => null,
                            'package_id' => null,
                            'batch_id' => null,
                            'product_name' => "[Servicio] " . $service['name'],
                            'unit_price' => $unitPrice,
                            'quantity' => $quantity,
                            'subtotal' => $itemSubtotal,
                        ];
                        break;

                    case 'paquete':
                        $packageId = (int)$item['package_id'];
                        $pkgStmt = $this->db->prepare('SELECT * FROM packages WHERE id = :id AND is_active = true');
                        $pkgStmt->execute(['id' => $packageId]);
                        $pkg = $pkgStmt->fetch();

                        if (!$pkg) {
                            throw new \RuntimeException("Paquete ID {$packageId} no encontrado o inactivo.");
                        }

                        // Obtener componentes del paquete
                        $compStmt = $this->db->prepare('SELECT * FROM package_items WHERE package_id = :pkg_id');
                        $compStmt->execute(['pkg_id' => $packageId]);
                        $components = $compStmt->fetchAll();

                        if (empty($components)) {
                            throw new \RuntimeException("El paquete '{$pkg['name']}' no tiene componentes configurados.");
                        }

                        // Descontar inventario de cada componente usando FIFO
                        foreach ($components as $comp) {
                            $subProdId = (int)$comp['product_id'];
                            $totalSubQtyToDeduct = (float)$comp['quantity'] * $quantity;

                            $this->deductProductBatchesFIFO($subProdId, $totalSubQtyToDeduct);
                        }

                        $unitPrice = (float)$pkg['price'];
                        $itemSubtotal = round($unitPrice * $quantity, 2);
                        $subtotal += $itemSubtotal;

                        $saleDetails[] = [
                            'item_type' => 'paquete',
                            'package_id' => $packageId,
                            'product_id' => null,
                            'service_id' => null,
                            'batch_id' => null,
                            'product_name' => "[Paquete] " . $pkg['name'],
                            'unit_price' => $unitPrice,
                            'quantity' => $quantity,
                            'subtotal' => $itemSubtotal,
                        ];
                        break;

                    case 'granel':
                        $productId = (int)$item['product_id'];
                        $prodStmt = $this->db->prepare('SELECT * FROM products WHERE id = :id AND is_active = true');
                        $prodStmt->execute(['id' => $productId]);
                        $product = $prodStmt->fetch();

                        if (!$product || !$product['is_bulk_enabled']) {
                            throw new \RuntimeException("El producto ID {$productId} no permite venta a granel.");
                        }

                        // Asegurar stock a granel suficiente (abre bolsas por FIFO si hace falta)
                        BulkInventoryHelper::ensureBulkStockAvailable($this->db, $productId, $quantity, $userId);

                        // Descontar del bulk_stock
                        $dbUpdate = $this->db->prepare('UPDATE products SET bulk_stock = bulk_stock - :qty WHERE id = :id');
                        $dbUpdate->execute(['qty' => $quantity, 'id' => $productId]);

                        $unitPrice = (float)($product['bulk_price'] ?: $product['sale_price']);
                        $itemSubtotal = round($unitPrice * $quantity, 2);
                        $subtotal += $itemSubtotal;

                        $saleDetails[] = [
                            'item_type' => 'granel',
                            'product_id' => $productId,
                            'package_id' => null,
                            'service_id' => null,
                            'batch_id' => null,
                            'product_name' => "{$product['name']} (Granel {$quantity} {$product['bulk_unit']})",
                            'unit_price' => $unitPrice,
                            'quantity' => $quantity,
                            'subtotal' => $itemSubtotal,
                        ];
                        break;

                    case 'fraccion':
                        $productId = (int)$item['product_id'];
                        $fractionId = (int)($item['fraction_id'] ?? 0);

                        $prodStmt = $this->db->prepare('SELECT * FROM products WHERE id = :id AND is_active = true');
                        $prodStmt->execute(['id' => $productId]);
                        $product = $prodStmt->fetch();

                        if (!$product) {
                            throw new \RuntimeException("Producto ID {$productId} no encontrado.");
                        }

                        // Buscar fracción
                        $fracStmt = $this->db->prepare('SELECT * FROM product_fraction_prices WHERE id = :fid');
                        $fracStmt->execute(['fid' => $fractionId]);
                        $fraction = $fracStmt->fetch();

                        $fractionName = $fraction ? $fraction['name'] : 'Fracción';
                        $multiplier = $fraction ? (float)$fraction['fraction_multiplier'] : 1.0;
                        $unitPrice = $fraction ? (float)$fraction['price'] : (float)$product['sale_price'];

                        // Peso total a descontar
                        $totalWeightToDeduct = $multiplier * $quantity;

                        // Asegurar stock a granel y descontar
                        BulkInventoryHelper::ensureBulkStockAvailable($this->db, $productId, $totalWeightToDeduct, $userId);
                        $dbUpdate = $this->db->prepare('UPDATE products SET bulk_stock = bulk_stock - :qty WHERE id = :id');
                        $dbUpdate->execute(['qty' => $totalWeightToDeduct, 'id' => $productId]);

                        $itemSubtotal = round($unitPrice * $quantity, 2);
                        $subtotal += $itemSubtotal;

                        $saleDetails[] = [
                            'item_type' => 'fraccion',
                            'product_id' => $productId,
                            'package_id' => null,
                            'service_id' => null,
                            'batch_id' => null,
                            'product_name' => "{$product['name']} ({$fractionName})",
                            'unit_price' => $unitPrice,
                            'quantity' => $quantity,
                            'subtotal' => $itemSubtotal,
                        ];
                        break;

                    case 'producto':
                    default:
                        $productId = (int)$item['product_id'];
                        $prodStmt = $this->db->prepare('SELECT * FROM products WHERE id = :id AND is_active = true');
                        $prodStmt->execute(['id' => $productId]);
                        $product = $prodStmt->fetch();

                        if (!$product) {
                            throw new \RuntimeException("Producto ID {$productId} no encontrado o inactivo.");
                        }

                        // 1. Verificar si aplica Precio de Mayoreo por Volumen
                        $effectivePrice = (float)$product['sale_price'];
                        $wholesaleStmt = $this->db->prepare('
                            SELECT * FROM product_wholesale_tiers 
                            WHERE product_id = :id AND is_active = true AND min_quantity <= :qty
                            ORDER BY min_quantity DESC LIMIT 1
                        ');
                        $wholesaleStmt->execute(['id' => $productId, 'qty' => $quantity]);
                        $wholesaleTier = $wholesaleStmt->fetch();

                        $isWholesaleApplied = false;
                        if ($wholesaleTier) {
                            $effectivePrice = (float)$wholesaleTier['wholesale_price'];
                            $isWholesaleApplied = true;
                        }

                        // 2. Descontar lotes con regla FIFO
                        $firstBatchId = $this->deductProductBatchesFIFO($productId, $quantity);

                        $itemSubtotal = round($effectivePrice * $quantity, 2);
                        $subtotal += $itemSubtotal;

                        $label = $product['name'] . ($isWholesaleApplied ? " (Mayoreo)" : "");

                        $saleDetails[] = [
                            'item_type' => 'producto',
                            'product_id' => $productId,
                            'package_id' => null,
                            'service_id' => null,
                            'batch_id' => $firstBatchId,
                            'product_name' => $label,
                            'unit_price' => $effectivePrice,
                            'quantity' => $quantity,
                            'subtotal' => $itemSubtotal,
                        ];
                        break;
                }
            }

            // Calcular total sin IVA (no se usa)
            $tax = 0.00;
            $discount = (float)($data['discount'] ?? 0);
            $total = max(0, round($subtotal - $discount, 2));

            // Crear venta
            $saleStmt = $this->db->prepare('
                INSERT INTO sales (user_id, ticket_number, subtotal, tax, discount, total, payment_method, notes)
                VALUES (:user_id, :ticket, :subtotal, :tax, :discount, :total, :payment, :notes) 
                RETURNING id
            ');
            $saleStmt->execute([
                'user_id' => $userId,
                'ticket' => $ticketNumber,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
                'payment' => $data['payment_method'] ?? 'efectivo',
                'notes' => $data['notes'] ?? null,
            ]);
            $saleId = $saleStmt->fetchColumn();

            // Insertar detalles
            $detailStmt = $this->db->prepare('
                INSERT INTO sale_details (sale_id, item_type, product_id, package_id, service_id, batch_id, product_name, unit_price, quantity, subtotal)
                VALUES (:sale_id, :item_type, :product_id, :package_id, :service_id, :batch_id, :product_name, :unit_price, :quantity, :subtotal)
            ');
            foreach ($saleDetails as $detail) {
                $detailStmt->execute(array_merge(['sale_id' => $saleId], $detail));
            }

            // Auto-crear ticket
            $this->db->prepare(
                'INSERT INTO tickets (sale_id, ticket_number, status) VALUES (:sale_id, :ticket, :status)'
            )->execute(['sale_id' => $saleId, 'ticket' => $ticketNumber, 'status' => 'generado']);

            $this->db->commit();

            Response::success('Venta registrada exitosamente.', [
                'sale_id' => $saleId,
                'ticket_number' => $ticketNumber,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
            ], 201);

        } catch (\RuntimeException $e) {
            $this->db->rollBack();
            Response::error($e->getMessage(), 400);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error al registrar la venta: ' . $e->getMessage(), 500);
        }
    }

    /** Helper para descontar de lotes por FIFO */
    private function deductProductBatchesFIFO(int $productId, float $quantity): ?int
    {
        $batchStmt = $this->db->prepare("
            SELECT * FROM product_batches 
            WHERE product_id = :id AND is_active = true AND (quantity - quantity_sold) > 0
            ORDER BY expiration_date ASC
        ");
        $batchStmt->execute(['id' => $productId]);
        $batches = $batchStmt->fetchAll();

        $remaining = $quantity;
        $firstBatchId = null;

        foreach ($batches as $batch) {
            if ($remaining <= 0) break;

            if ($firstBatchId === null) $firstBatchId = $batch['id'];

            $available = $batch['quantity'] - $batch['quantity_sold'];
            $toDeduct = min($remaining, $available);

            $this->db->prepare(
                'UPDATE product_batches SET quantity_sold = quantity_sold + :deduct WHERE id = :id'
            )->execute(['deduct' => $toDeduct, 'id' => $batch['id']]);

            $remaining -= $toDeduct;
        }

        if ($remaining > 0) {
            $prodNameStmt = $this->db->prepare('SELECT name FROM products WHERE id = :id');
            $prodNameStmt->execute(['id' => $productId]);
            $name = $prodNameStmt->fetchColumn() ?: "ID {$productId}";
            throw new \RuntimeException("Stock insuficiente para '{$name}'. Faltan {$remaining} unidades.");
        }

        return $firstBatchId;
    }

    /** GET /api/sales - Listar ventas con filtros */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
        $dateFrom = $_GET['date_from'] ?? '';
        $dateTo = $_GET['date_to'] ?? '';
        $userId = $_GET['user_id'] ?? '';
        $offset = ($page - 1) * $perPage;

        $where = [];
        $params = [];

        if ($dateFrom) { $where[] = "s.created_at >= :date_from"; $params['date_from'] = $dateFrom . ' 00:00:00'; }
        if ($dateTo) { $where[] = "s.created_at <= :date_to"; $params['date_to'] = $dateTo . ' 23:59:59'; }
        if ($userId) { $where[] = "s.user_id = :user_id"; $params['user_id'] = $userId; }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM sales s {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT s.*, u.name as seller_name 
             FROM sales s 
             LEFT JOIN users u ON u.id = s.user_id 
             {$whereClause}
             ORDER BY s.created_at DESC 
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $key => $value) $stmt->bindValue($key, $value);
        $stmt->bindValue('limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        Response::paginate($stmt->fetchAll(), $total, $page, $perPage);
    }

    /** GET /api/sales/{id} - Detalle de venta */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare(
            'SELECT s.*, u.name as seller_name FROM sales s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = :id'
        );
        $stmt->execute(['id' => $id]);
        $sale = $stmt->fetch();

        if (!$sale) Response::error('Venta no encontrada.', 404);

        $detailStmt = $this->db->prepare(
            'SELECT sd.*, pb.batch_number, pb.expiration_date 
             FROM sale_details sd 
             LEFT JOIN product_batches pb ON pb.id = sd.batch_id 
             WHERE sd.sale_id = :sale_id'
        );
        $detailStmt->execute(['sale_id' => $id]);
        $sale['details'] = $detailStmt->fetchAll();

        Response::success('Venta encontrada.', $sale);
    }
}
