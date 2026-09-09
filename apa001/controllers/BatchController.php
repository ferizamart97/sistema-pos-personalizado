<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

use App\middleware\AuthMiddleware;
use App\middleware\RoleMiddleware;
use App\helpers\Response;
use App\helpers\Validator;
use Database;

/**
 * Controlador de Lotes de Producto
 * Cada producto puede tener múltiples lotes con diferentes fechas de caducidad
 */
class BatchController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/products/{productId}/batches */
    public function index(string $productId): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare(
            "SELECT pb.*, 
                    (pb.quantity - pb.quantity_sold) as stock_available,
                    (pb.expiration_date - CURRENT_DATE) as days_remaining,
                    CASE
                        WHEN (pb.expiration_date - CURRENT_DATE) <= 0 THEN 'expired'
                        WHEN (pb.expiration_date - CURRENT_DATE) <= 30 THEN 'red'
                        WHEN (pb.expiration_date - CURRENT_DATE) BETWEEN 31 AND 59 THEN 'orange'
                        WHEN (pb.expiration_date - CURRENT_DATE) BETWEEN 60 AND 89 THEN 'yellow'
                        ELSE 'green'
                    END as semaphore
             FROM product_batches pb
             WHERE pb.product_id = :product_id
             ORDER BY pb.expiration_date ASC"
        );
        $stmt->execute(['product_id' => $productId]);

        Response::success('Lotes obtenidos.', $stmt->fetchAll());
    }

    /** POST /api/products/{productId}/batches */
    public function store(string $productId): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $errors = Validator::validate($data, [
            'quantity' => 'required|integer',
            'expiration_date' => 'required|date',
        ]);
        if (!empty($errors)) Response::error('Datos inválidos.', 422, $errors);

        // Verificar que el producto existe
        $productStmt = $this->db->prepare('SELECT id FROM products WHERE id = :id');
        $productStmt->execute(['id' => $productId]);
        if (!$productStmt->fetch()) Response::error('Producto no encontrado.', 404);

        // Generar número de lote automático: L-YYYY-NNN
        $year = date('Y');
        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM product_batches WHERE batch_number LIKE :pattern"
        );
        $countStmt->execute(['pattern' => "L-{$year}-%"]);
        $count = (int)$countStmt->fetchColumn() + 1;
        $batchNumber = sprintf("L-%s-%03d", $year, $count);

        $stmt = $this->db->prepare(
            'INSERT INTO product_batches (product_id, batch_number, quantity, expiration_date, received_date, notes)
             VALUES (:product_id, :batch, :qty, :exp_date, :rec_date, :notes) RETURNING id'
        );
        $stmt->execute([
            'product_id' => $productId,
            'batch' => $data['batch_number'] ?? $batchNumber,
            'qty' => $data['quantity'],
            'exp_date' => $data['expiration_date'],
            'rec_date' => $data['received_date'] ?? date('Y-m-d'),
            'notes' => $data['notes'] ?? null,
        ]);

        Response::success('Lote registrado.', [
            'id' => $stmt->fetchColumn(),
            'batch_number' => $data['batch_number'] ?? $batchNumber,
        ], 201);
    }

    /** PUT /api/batches/{id} */
    public function update(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $fields = [];
        $params = ['id' => $id];

        if (isset($data['quantity'])) { $fields[] = 'quantity = :qty'; $params['qty'] = $data['quantity']; }
        if (isset($data['expiration_date'])) { $fields[] = 'expiration_date = :exp'; $params['exp'] = $data['expiration_date']; }
        if (isset($data['received_date'])) { $fields[] = 'received_date = :rec'; $params['rec'] = $data['received_date']; }
        if (isset($data['notes'])) { $fields[] = 'notes = :notes'; $params['notes'] = $data['notes']; }

        if (empty($fields)) Response::error('No se proporcionaron datos.', 400);

        $this->db->prepare('UPDATE product_batches SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        Response::success('Lote actualizado.');
    }

    /** PATCH /api/batches/{id}/toggle */
    public function toggle(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $stmt = $this->db->prepare('UPDATE product_batches SET is_active = NOT is_active WHERE id = :id RETURNING is_active');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        if (!$result) Response::error('Lote no encontrado.', 404);
        Response::success('Estado del lote actualizado.', ['is_active' => $result['is_active']]);
    }

    /** DELETE /api/batches/{id} */
    public function destroy(string $id): void
    {
        RoleMiddleware::authorize(['admin']);
        $this->db->prepare('DELETE FROM product_batches WHERE id = :id')->execute(['id' => $id]);
        Response::success('Lote eliminado permanentemente.');
    }
}
