<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';

use App\middleware\AuthMiddleware;
use App\helpers\Response;
use Database;

/**
 * Controlador de Paquetes y Combos Piñateros (20 personas, 50 personas, etc.)
 */
class PackageController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/packages - Listar todos los paquetes */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 15)));
        $search = $_GET['search'] ?? '';
        $isActive = $_GET['is_active'] ?? '';
        $offset = ($page - 1) * $perPage;

        $where = [];
        $params = [];

        if ($search) {
            $where[] = "(p.name ILIKE :search OR p.sku ILIKE :search)";
            $params['search'] = "%{$search}%";
        }
        if ($isActive !== '') {
            $where[] = "p.is_active = :active";
            $params['active'] = filter_var($isActive, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM packages p {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare("
            SELECT p.*,
                   (SELECT COUNT(*) FROM package_items pi WHERE pi.package_id = p.id) as total_items
            FROM packages p
            {$whereClause}
            ORDER BY p.is_active DESC, p.capacity_people ASC, p.name ASC
            LIMIT {$perPage} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $packages = $stmt->fetchAll();

        // Para cada paquete, obtener los items componentes y calcular el stock virtual disponible
        foreach ($packages as &$pkg) {
            $itemsStmt = $this->db->prepare('
                SELECT pi.*, pr.name as product_name, pr.sku as product_sku, pr.sale_price, pr.purchase_price, pr.image_url,
                       COALESCE((
                           SELECT SUM(pb.quantity - pb.quantity_sold) 
                           FROM product_batches pb 
                           WHERE pb.product_id = pr.id AND pb.is_active = true
                       ), 0) as available_product_stock
                FROM package_items pi
                JOIN products pr ON pr.id = pi.product_id
                WHERE pi.package_id = :pkg_id
            ');
            $itemsStmt->execute(['pkg_id' => $pkg['id']]);
            $items = $itemsStmt->fetchAll();

            $pkg['items'] = $items;

            // Calcular cuántos paquetes completos se pueden armar con el inventario actual
            $maxPossible = PHP_INT_MAX;
            if (empty($items)) {
                $maxPossible = 0;
            } else {
                foreach ($items as $item) {
                    $neededPerPkg = (float)$item['quantity'];
                    $availStock = (float)$item['available_product_stock'];
                    if ($neededPerPkg > 0) {
                        $possibleForThisItem = (int)floor($availStock / $neededPerPkg);
                        $maxPossible = min($maxPossible, $possibleForThisItem);
                    }
                }
            }
            $pkg['virtual_stock'] = ($maxPossible === PHP_INT_MAX) ? 0 : $maxPossible;
        }

        Response::paginate($packages, $total, $page, $perPage);
    }

    /** GET /api/packages/{id} - Detalle de un paquete */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('SELECT * FROM packages WHERE id = :id');
        $stmt->execute(['id' => (int)$id]);
        $pkg = $stmt->fetch();

        if (!$pkg) Response::error('Paquete no encontrado.', 404);

        $itemsStmt = $this->db->prepare('
            SELECT pi.*, pr.name as product_name, pr.sku as product_sku, pr.sale_price
            FROM package_items pi
            JOIN products pr ON pr.id = pi.product_id
            WHERE pi.package_id = :pkg_id
        ');
        $itemsStmt->execute(['pkg_id' => $pkg['id']]);
        $pkg['items'] = $itemsStmt->fetchAll();

        Response::success('Detalle de paquete.', $pkg);
    }

    /** POST /api/packages - Crear nuevo paquete */
    public function store(): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['name']) || empty($data['sku']) || !isset($data['price'])) {
            Response::error('Nombre, SKU y Precio son obligatorios.', 422);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('
                INSERT INTO packages (name, sku, description, price, capacity_people)
                VALUES (:name, :sku, :desc, :price, :capacity)
                RETURNING *
            ');
            $stmt->execute([
                'name' => trim($data['name']),
                'sku' => strtoupper(trim($data['sku'])),
                'desc' => $data['description'] ?? null,
                'price' => (float)$data['price'],
                'capacity' => (int)($data['capacity_people'] ?? 20)
            ]);
            $package = $stmt->fetch();

            // Insertar componentes
            if (!empty($data['items']) && is_array($data['items'])) {
                $itemStmt = $this->db->prepare('
                    INSERT INTO package_items (package_id, product_id, quantity, unit)
                    VALUES (:pkg_id, :prod_id, :qty, :unit)
                ');
                foreach ($data['items'] as $item) {
                    $itemStmt->execute([
                        'pkg_id' => $package['id'],
                        'prod_id' => (int)$item['product_id'],
                        'qty' => (float)($item['quantity'] ?? 1),
                        'unit' => $item['unit'] ?? 'pza'
                    ]);
                }
            }

            $this->db->commit();
            Response::success('Paquete registrado exitosamente.', $package, 201);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error al registrar paquete: ' . $e->getMessage(), 500);
        }
    }

    /** PUT /api/packages/{id} - Actualizar paquete */
    public function update(string $id): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('
                UPDATE packages 
                SET name = :name,
                    sku = :sku,
                    description = :desc,
                    price = :price,
                    capacity_people = :capacity
                WHERE id = :id
                RETURNING *
            ');
            $stmt->execute([
                'name' => trim($data['name']),
                'sku' => strtoupper(trim($data['sku'])),
                'desc' => $data['description'] ?? null,
                'price' => (float)$data['price'],
                'capacity' => (int)($data['capacity_people'] ?? 20),
                'id' => (int)$id
            ]);
            $package = $stmt->fetch();

            if (!$package) {
                $this->db->rollBack();
                Response::error('Paquete no encontrado.', 404);
            }

            // Actualizar items
            if (isset($data['items']) && is_array($data['items'])) {
                $this->db->prepare('DELETE FROM package_items WHERE package_id = :id')->execute(['id' => (int)$id]);

                $itemStmt = $this->db->prepare('
                    INSERT INTO package_items (package_id, product_id, quantity, unit)
                    VALUES (:pkg_id, :prod_id, :qty, :unit)
                ');
                foreach ($data['items'] as $item) {
                    $itemStmt->execute([
                        'pkg_id' => (int)$id,
                        'prod_id' => (int)$item['product_id'],
                        'qty' => (float)($item['quantity'] ?? 1),
                        'unit' => $item['unit'] ?? 'pza'
                    ]);
                }
            }

            $this->db->commit();
            Response::success('Paquete actualizado.', $package);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error al actualizar paquete: ' . $e->getMessage(), 500);
        }
    }

    /** PATCH /api/packages/{id}/toggle - Deshabilitar / habilitar */
    public function toggle(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('UPDATE packages SET is_active = NOT is_active WHERE id = :id RETURNING id, name, is_active');
        $stmt->execute(['id' => (int)$id]);
        $res = $stmt->fetch();

        if (!$res) Response::error('Paquete no encontrado.', 404);
        Response::success('Estado de paquete actualizado.', $res);
    }

    /** DELETE /api/packages/{id} - Eliminar paquete */
    public function destroy(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('DELETE FROM packages WHERE id = :id');
        $stmt->execute(['id' => (int)$id]);

        Response::success('Paquete eliminado.');
    }
}
