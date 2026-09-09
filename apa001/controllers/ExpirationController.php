<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';

use App\middleware\AuthMiddleware;
use App\helpers\Response;
use Database;

/**
 * Controlador de Caducidad (Semáforo)
 * Consulta la vista v_expiration_semaphore
 */
class ExpirationController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/expirations - Lotes por semáforo */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $semaphore = $_GET['semaphore'] ?? '';
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 10)));
        $offset = ($page - 1) * $perPage;

        $where = '';
        $params = [];

        if ($semaphore) {
            $where = 'WHERE semaphore = :semaphore';
            $params['semaphore'] = $semaphore;
        }

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM v_expiration_semaphore {$where}"
        );
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT * FROM v_expiration_semaphore {$where} 
             ORDER BY days_remaining ASC 
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $key => $value) $stmt->bindValue($key, $value);
        $stmt->bindValue('limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        Response::paginate($stmt->fetchAll(), $total, $page, $perPage);
    }

    /** GET /api/expirations/summary - Conteo por color de semáforo */
    public function summary(): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->query(
            "SELECT semaphore, semaphore_label, COUNT(*) as count, 
                    SUM(stock_remaining) as total_stock
             FROM v_expiration_semaphore 
             GROUP BY semaphore, semaphore_label
             ORDER BY 
                CASE semaphore 
                    WHEN 'red' THEN 1 
                    WHEN 'orange' THEN 2 
                    WHEN 'yellow' THEN 3 
                    WHEN 'green' THEN 4 
                END"
        );

        Response::success('Resumen de caducidad.', $stmt->fetchAll());
    }
}
