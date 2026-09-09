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
 * Controlador para Venta a Granel, Fraccionamiento y Precios de Mayoreo
 */
class BulkProductController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** POST /api/products/{id}/bulk-config - Configurar venta a granel de un producto */
    public function updateBulkConfig(string $productId): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $this->db->prepare('
            UPDATE products 
            SET is_bulk_enabled = :is_bulk,
                bulk_unit = :unit,
                bulk_price = :price,
                package_content = :content
            WHERE id = :id
            RETURNING id, name, is_bulk_enabled, bulk_unit, bulk_price, package_content, bulk_stock
        ');

        $stmt->execute([
            'is_bulk' => !empty($data['is_bulk_enabled']) ? 'true' : 'false',
            'unit' => $data['bulk_unit'] ?? 'kg',
            'price' => (float)($data['bulk_price'] ?? 0),
            'content' => (float)($data['package_content'] ?? 1.000),
            'id' => (int)$productId
        ]);

        $updated = $stmt->fetch();
        if (!$updated) Response::error('Producto no encontrado.', 404);

        Response::success('Configuración de granel actualizada.', $updated);
    }

    /** POST /api/products/{id}/open-bulk - Abrir una bolsa sellada para venta a granel */
    public function openBulkPackage(string $productId): void
    {
        $user = AuthMiddleware::authenticate();
        $userId = is_array($user) ? $user['user_id'] : ($user->user_id ?? 1);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $packagesCount = max(1, (int)($data['packages_count'] ?? 1));

        try {
            $result = BulkInventoryHelper::openPackageForBulk($this->db, (int)$productId, $packagesCount, $userId);
            Response::success("Se abrieron {$packagesCount} bolsa(s) exitosamente y se sumaron al stock a granel.", $result);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    /** GET /api/products/{id}/fractions - Listar fracciones de un producto (1kg, 1/2kg, 1/4kg, suelta) */
    public function getFractions(string $productId): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('
            SELECT * FROM product_fraction_prices 
            WHERE product_id = :id AND is_active = true 
            ORDER BY fraction_multiplier DESC
        ');
        $stmt->execute(['id' => (int)$productId]);
        $fractions = $stmt->fetchAll();

        Response::success('Fracciones obtenidas.', $fractions);
    }

    /** POST /api/products/{id}/fractions - Guardar o agregar fracción de precio */
    public function saveFraction(string $productId): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['name']) || !isset($data['fraction_multiplier']) || !isset($data['price'])) {
            Response::error('Nombre, multiplicador y precio son requeridos.', 422);
        }

        $stmt = $this->db->prepare('
            INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
            VALUES (:pid, :name, :multiplier, :price)
            RETURNING *
        ');
        $stmt->execute([
            'pid' => (int)$productId,
            'name' => trim($data['name']),
            'multiplier' => (float)$data['fraction_multiplier'],
            'price' => (float)$data['price']
        ]);

        Response::success('Fracción de precio registrada.', $stmt->fetch(), 201);
    }

    /** DELETE /api/products/fractions/{id} - Eliminar fracción */
    public function deleteFraction(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('DELETE FROM product_fraction_prices WHERE id = :id');
        $stmt->execute(['id' => (int)$id]);

        Response::success('Fracción eliminada.');
    }

    /** GET /api/products/{id}/wholesale-tiers - Escalas de mayoreo */
    public function getWholesaleTiers(string $productId): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('
            SELECT * FROM product_wholesale_tiers 
            WHERE product_id = :id AND is_active = true 
            ORDER BY min_quantity ASC
        ');
        $stmt->execute(['id' => (int)$productId]);
        $tiers = $stmt->fetchAll();

        Response::success('Escalas de mayoreo obtenidas.', $tiers);
    }

    /** POST /api/products/{id}/wholesale-tiers - Agregar escala de mayoreo */
    public function saveWholesaleTier(string $productId): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['min_quantity']) || empty($data['wholesale_price'])) {
            Response::error('Cantidad mínima y precio de mayoreo son requeridos.', 422);
        }

        // Validar que el precio de mayoreo no sea menor al precio de compra
        $prodStmt = $this->db->prepare('SELECT purchase_price FROM products WHERE id = :id');
        $prodStmt->execute(['id' => (int)$productId]);
        $prod = $prodStmt->fetch();
        if ($prod) {
            $purchasePrice = (float)($prod['purchase_price'] ?? 0);
            if ((float)$data['wholesale_price'] < $purchasePrice) {
                Response::error("El precio de mayoreo ($" . number_format((float)$data['wholesale_price'], 2) . ") no puede ser menor al costo de compra ($" . number_format($purchasePrice, 2) . ").", 422);
            }
        }

        $stmt = $this->db->prepare('
            INSERT INTO product_wholesale_tiers (product_id, min_quantity, wholesale_price)
            VALUES (:pid, :min_qty, :price)
            RETURNING *
        ');
        $stmt->execute([
            'pid' => (int)$productId,
            'min_qty' => (float)$data['min_quantity'],
            'price' => (float)$data['wholesale_price']
        ]);

        Response::success('Escala de mayoreo registrada.', $stmt->fetch(), 201);
    }

    /** DELETE /api/products/wholesale-tiers/{id} - Eliminar escala */
    public function deleteWholesaleTier(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('DELETE FROM product_wholesale_tiers WHERE id = :id');
        $stmt->execute(['id' => (int)$id]);

        Response::success('Escala de mayoreo eliminada.');
    }

    /** GET /api/products/{id}/bulk-history - Historial de bolsas abiertas */
    public function getBulkHistory(string $productId): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('
            SELECT a.id, a.user_id, u.name as user_name, a.created_at, a.new_values
            FROM audit_log a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.entity = \'products\' AND a.entity_id = :id AND a.action = \'open_bulk_package\'
            ORDER BY a.created_at DESC
        ');
        $stmt->execute(['id' => (int)$productId]);
        $rows = $stmt->fetchAll();

        $history = [];
        foreach ($rows as $r) {
            $details = json_decode($r['new_values'] ?? '{}', true);
            $history[] = [
                'id' => $r['id'],
                'user_name' => $r['user_name'] ?? 'Sistema',
                'created_at' => $r['created_at'],
                'packages_opened' => $details['packages_opened'] ?? 1,
                'content_added' => $details['content_added'] ?? 0,
                'new_bulk_stock' => $details['new_bulk_stock'] ?? 0,
                'affected_batches' => $details['affected_batches'] ?? []
            ];
        }

        Response::success('Historial de aperturas obtenido.', $history);
    }
}
