<?php
namespace App\services;

require_once __DIR__ . '/../config/database.php';
use Database;

/**
 * Servicio de alertas y notificaciones proactivas para pedidos y apartados
 */
class OrderNotificationService
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Obtener resumen de alertas activas
     */
    public function getPendingAlerts(): array
    {
        // 1. Pedidos personalizados que se deben entregar en las próximas 72 horas
        $orderStmt = $this->db->query("
            SELECT id, order_number, customer_name, customer_phone, description, required_date, status, pending_balance,
                   ROUND(EXTRACT(EPOCH FROM (required_date - NOW())) / 3600) as hours_remaining
            FROM custom_orders
            WHERE status IN ('pendiente', 'en_proceso')
              AND required_date BETWEEN NOW() AND (NOW() + INTERVAL '3 days')
            ORDER BY required_date ASC
        ");
        $urgentOrders = $orderStmt->fetchAll();

        // 2. Apartados por vencer (faltan 5 días o menos para cumplir los 30 días)
        $layawayExpiringStmt = $this->db->query("
            SELECT id, folio, customer_name, customer_phone, total_amount, remaining_balance, expiration_date,
                   (expiration_date - CURRENT_DATE) as days_remaining
            FROM layaways
            WHERE status = 'activo'
              AND remaining_balance > 0
              AND expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '5 days')
            ORDER BY expiration_date ASC
        ");
        $expiringLayaways = $layawayExpiringStmt->fetchAll();

        // 3. Apartados ya vencidos que requieren contacto de admin o están en periodo de gracia (10 días)
        $layawayGraceStmt = $this->db->query("
            SELECT id, folio, customer_name, customer_phone, remaining_balance, expiration_date, grace_period_end_date, admin_contacted,
                   (grace_period_end_date - CURRENT_DATE) as grace_days_left
            FROM layaways
            WHERE status IN ('vencido', 'gracia_10_dias')
              AND remaining_balance > 0
            ORDER BY grace_period_end_date ASC
        ");
        $graceLayaways = $layawayGraceStmt->fetchAll();

        return [
            'orders_due_soon' => [
                'count' => count($urgentOrders),
                'items' => $urgentOrders
            ],
            'layaways_expiring_soon' => [
                'count' => count($expiringLayaways),
                'items' => $expiringLayaways
            ],
            'layaways_in_grace_or_overdue' => [
                'count' => count($graceLayaways),
                'items' => $graceLayaways
            ]
        ];
    }
}
