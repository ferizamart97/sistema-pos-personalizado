<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../services/OrderNotificationService.php';

use App\middleware\RoleMiddleware;
use App\helpers\Response;
use App\services\OrderNotificationService;
use Database;

/**
 * Controlador de Dashboard
 * Estadísticas generales y alertas proactivas del sistema
 */
class DashboardController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/dashboard/stats */
    public function stats(): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);

        $stats = [];

        // Ventas de hoy
        $stmt = $this->db->query("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE DATE(created_at) = CURRENT_DATE AND status = 'completada'");
        $today = $stmt->fetch();
        $stats['sales_today'] = ['count' => (int)$today['count'], 'total' => (float)$today['total']];

        // Ventas de la semana
        $stmt = $this->db->query("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE created_at >= date_trunc('week', CURRENT_DATE) AND status = 'completada'");
        $week = $stmt->fetch();
        $stats['sales_week'] = ['count' => (int)$week['count'], 'total' => (float)$week['total']];

        // Ventas del mes
        $stmt = $this->db->query("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status = 'completada'");
        $month = $stmt->fetch();
        $stats['sales_month'] = ['count' => (int)$month['count'], 'total' => (float)$month['total']];

        // Productos activos
        $stats['active_products'] = (int)$this->db->query("SELECT COUNT(*) FROM products WHERE is_active = true")->fetchColumn();

        // Paquetes y servicios activos
        $stats['active_packages'] = (int)$this->db->query("SELECT COUNT(*) FROM packages WHERE is_active = true")->fetchColumn();
        $stats['active_services'] = (int)$this->db->query("SELECT COUNT(*) FROM services WHERE is_active = true")->fetchColumn();

        // Productos con stock bajo
        $stmt = $this->db->query(
            "SELECT COUNT(DISTINCT p.id) FROM products p
             LEFT JOIN (SELECT product_id, SUM(quantity - quantity_sold) as total_stock FROM product_batches WHERE is_active = true GROUP BY product_id) b ON b.product_id = p.id
             WHERE p.is_active = true AND COALESCE(b.total_stock, 0) <= p.min_stock"
        );
        $stats['low_stock_count'] = (int)$stmt->fetchColumn();

        // Semáforo de caducidad (resumen)
        $semaStmt = $this->db->query(
            "SELECT semaphore, COUNT(*) as count FROM v_expiration_semaphore GROUP BY semaphore"
        );
        $semaphore = ['red' => 0, 'orange' => 0, 'yellow' => 0, 'green' => 0];
        while ($row = $semaStmt->fetch()) {
            $semaphore[$row['semaphore']] = (int)$row['count'];
        }
        $stats['expiration_semaphore'] = $semaphore;

        // Top 5 productos más vendidos
        $topStmt = $this->db->query(
            "SELECT sd.product_name, SUM(sd.quantity) as total_sold, SUM(sd.subtotal) as total_revenue
             FROM sale_details sd
             JOIN sales s ON s.id = sd.sale_id
             WHERE s.status = 'completada'
             GROUP BY sd.product_name
             ORDER BY total_sold DESC LIMIT 5"
        );
        $stats['top_products'] = $topStmt->fetchAll();

        // Ventas últimos 7 días (para gráfica)
        $chartStmt = $this->db->query(
            "SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(total), 0) as total
             FROM sales WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'completada'
             GROUP BY DATE(created_at) ORDER BY date"
        );
        $stats['sales_chart'] = $chartStmt->fetchAll();

        // Alertas proactivas de pedidos próximos y apartados por vencer
        $notifService = new OrderNotificationService();
        $stats['alerts'] = $notifService->getPendingAlerts();

        Response::success('Estadísticas del dashboard.', $stats);
    }
}
