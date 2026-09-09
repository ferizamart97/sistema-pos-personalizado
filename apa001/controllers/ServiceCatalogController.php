<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';

use App\middleware\AuthMiddleware;
use App\helpers\Response;
use Database;

/**
 * Controlador de Catálogo de Servicios (Helio, Envolturas, Obleas, etc.)
 */
class ServiceCatalogController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/services - Listar todos los servicios */
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
            $where[] = "(name ILIKE :search OR description ILIKE :search)";
            $params['search'] = "%{$search}%";
        }
        if ($isActive !== '') {
            $where[] = "is_active = :active";
            $params['active'] = filter_var($isActive, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM services {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare("
            SELECT * FROM services 
            {$whereClause}
            ORDER BY is_active DESC, category ASC, name ASC
            LIMIT {$perPage} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $services = $stmt->fetchAll();

        Response::paginate($services, $total, $page, $perPage);
    }

    /** GET /api/services/{id} - Detalle de servicio */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('SELECT * FROM services WHERE id = :id');
        $stmt->execute(['id' => (int)$id]);
        $service = $stmt->fetch();

        if (!$service) Response::error('Servicio no encontrado.', 404);
        Response::success('Detalle de servicio.', $service);
    }

    /** POST /api/services - Crear nuevo servicio */
    public function store(): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['name'])) {
            Response::error('El nombre del servicio es obligatorio.', 422);
        }

        // Asegurar que la columna estimated_time_minutes exista
        try {
            $this->db->exec('ALTER TABLE services ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER DEFAULT 15');
        } catch (\Exception $e) {
            // Ignorar si ya existe
        }

        $stmt = $this->db->prepare('
            INSERT INTO services (name, description, category, price_type, base_price, estimated_time_minutes)
            VALUES (:name, :desc, :cat, :ptype, :price, :time)
            RETURNING *
        ');
        $stmt->execute([
            'name' => trim($data['name']),
            'desc' => $data['description'] ?? null,
            'cat' => $data['category'] ?? 'general',
            'ptype' => $data['price_type'] ?? 'variable',
            'price' => (float)($data['base_price'] ?? 0),
            'time' => (int)($data['estimated_time_minutes'] ?? 15)
        ]);

        Response::success('Servicio registrado exitosamente.', $stmt->fetch(), 201);
    }

    /** PUT /api/services/{id} - Actualizar servicio */
    public function update(string $id): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $this->db->exec('ALTER TABLE services ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER DEFAULT 15');
        } catch (\Exception $e) {
            // Ignorar si ya existe
        }

        $stmt = $this->db->prepare('
            UPDATE services 
            SET name = :name,
                description = :desc,
                category = :cat,
                price_type = :ptype,
                base_price = :price,
                estimated_time_minutes = :time
            WHERE id = :id
            RETURNING *
        ');
        $stmt->execute([
            'name' => trim($data['name']),
            'desc' => $data['description'] ?? null,
            'cat' => $data['category'] ?? 'general',
            'ptype' => $data['price_type'] ?? 'variable',
            'price' => (float)($data['base_price'] ?? 0),
            'time' => (int)($data['estimated_time_minutes'] ?? 15),
            'id' => (int)$id
        ]);

        $service = $stmt->fetch();
        if (!$service) Response::error('Servicio no encontrado.', 404);

        Response::success('Servicio actualizado.', $service);
    }

    /** PATCH /api/services/{id}/toggle - Habilitar / deshabilitar */
    public function toggle(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('UPDATE services SET is_active = NOT is_active WHERE id = :id RETURNING id, name, is_active');
        $stmt->execute(['id' => (int)$id]);
        $res = $stmt->fetch();

        if (!$res) Response::error('Servicio no encontrado.', 404);
        Response::success('Estado de servicio actualizado.', $res);
    }

    /** DELETE /api/services/{id} - Eliminar servicio */
    public function destroy(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('DELETE FROM services WHERE id = :id');
        $stmt->execute(['id' => (int)$id]);

        Response::success('Servicio eliminado.');
    }
}
