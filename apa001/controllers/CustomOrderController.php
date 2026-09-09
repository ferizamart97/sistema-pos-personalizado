<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../services/MailService.php';
require_once __DIR__ . '/../services/WhatsAppService.php';

use App\middleware\AuthMiddleware;
use App\helpers\Response;
use App\services\MailService;
use App\services\WhatsAppService;
use Database;

/**
 * Controlador de Pedidos Especiales (Obleas, Transfer para pastel, Arreglos personalizados)
 */
class CustomOrderController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/custom-orders - Listar pedidos con filtros de fecha y estatus */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $status = $_GET['status'] ?? '';
        $daysUpcoming = isset($_GET['upcoming_days']) ? (int)$_GET['upcoming_days'] : null;

        $query = '
            SELECT co.*, u.name as seller_name 
            FROM custom_orders co
            LEFT JOIN users u ON u.id = co.user_id
            WHERE 1=1
        ';
        $params = [];

        if (!empty($status)) {
            $query .= ' AND co.status = :status';
            $params['status'] = $status;
        }

        if ($daysUpcoming !== null) {
            $query .= ' AND co.required_date BETWEEN NOW() AND (NOW() + (:days || \' days\')::INTERVAL) AND co.status IN (\'pendiente\', \'en_proceso\')';
            $params['days'] = $daysUpcoming;
        }

        $query .= ' ORDER BY co.required_date ASC';

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        Response::success('Pedidos obtenidos.', $orders);
    }

    /** GET /api/custom-orders/{id} - Detalle de pedido */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('
            SELECT co.*, u.name as seller_name 
            FROM custom_orders co
            LEFT JOIN users u ON u.id = co.user_id
            WHERE co.id = :id
        ');
        $stmt->execute(['id' => (int)$id]);
        $order = $stmt->fetch();

        if (!$order) Response::error('Pedido no encontrado.', 404);
        Response::success('Detalle de pedido.', $order);
    }

    /** POST /api/custom-orders - Registrar nuevo pedido con anticipo */
    public function store(): void
    {
        $user = AuthMiddleware::authenticate();
        $userId = is_array($user) ? $user['user_id'] : ($user->user_id ?? 1);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['customer_name']) || empty($data['customer_phone']) || empty($data['description']) || empty($data['required_date'])) {
            Response::error('Nombre del cliente, teléfono, descripción y fecha requerida son obligatorios.', 422);
        }

        $total = (float)($data['total'] ?? 0);
        $deposit = (float)($data['deposit_amount'] ?? 0);
        $pending = max(0, $total - $deposit);

        // Generar número de pedido: PED-YYYYMMDD-NNN
        $dateStr = date('Ymd');
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM custom_orders WHERE order_number LIKE :prefix");
        $countStmt->execute(['prefix' => "PED-{$dateStr}-%"]);
        $seq = (int)$countStmt->fetchColumn() + 1;
        $orderNumber = sprintf('PED-%s-%03d', $dateStr, $seq);

        $stmt = $this->db->prepare('
            INSERT INTO custom_orders (
                order_number, user_id, customer_name, customer_phone, customer_email,
                description, required_date, total, deposit_amount, pending_balance, status, notes
            )
            VALUES (
                :order_num, :user_id, :c_name, :c_phone, :c_email,
                :desc, :req_date, :total, :deposit, :pending, \'pendiente\', :notes
            )
            RETURNING *
        ');

        $stmt->execute([
            'order_num' => $orderNumber,
            'user_id' => $userId,
            'c_name' => trim($data['customer_name']),
            'c_phone' => trim($data['customer_phone']),
            'c_email' => !empty($data['customer_email']) ? trim($data['customer_email']) : null,
            'desc' => trim($data['description']),
            'req_date' => $data['required_date'],
            'total' => $total,
            'deposit' => $deposit,
            'pending' => $pending,
            'notes' => $data['notes'] ?? null
        ]);

        $order = $stmt->fetch();

        // Generar mensaje formateado para WhatsApp
        $waMessage = $this->generateOrderTextMessage($order);
        $cleanPhone = preg_replace('/[^0-9]/', '', $order['customer_phone']);
        if (strlen($cleanPhone) === 10) $cleanPhone = '52' . $cleanPhone;
        $directUrl = "https://api.whatsapp.com/send?phone={$cleanPhone}&text=" . urlencode($waMessage);

        Response::success('Pedido registrado exitosamente.', [
            'order' => $order,
            'whatsapp_url' => $directUrl,
            'whatsapp_message' => $waMessage
        ], 201);
    }

    /** PUT /api/custom-orders/{id}/status - Cambiar estado del pedido */
    public function updateStatus(string $id): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $allowedStatuses = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado_reembolso', 'cancelado_cambio'];
        $newStatus = $data['status'] ?? '';

        if (!in_array($newStatus, $allowedStatuses)) {
            Response::error('Estado no válido.', 422);
        }

        $stmt = $this->db->prepare('
            UPDATE custom_orders 
            SET status = :status,
                cancellation_reason = :reason,
                refund_type = :ref_type,
                refund_amount = :ref_amt
            WHERE id = :id
            RETURNING *
        ');
        $stmt->execute([
            'status' => $newStatus,
            'reason' => $data['cancellation_reason'] ?? null,
            'ref_type' => $data['refund_type'] ?? null,
            'ref_amt' => isset($data['refund_amount']) ? (float)$data['refund_amount'] : 0,
            'id' => (int)$id
        ]);

        $order = $stmt->fetch();
        if (!$order) Response::error('Pedido no encontrado.', 404);

        Response::success("Estado de pedido actualizado a {$newStatus}.", $order);
    }

    /** POST /api/custom-orders/{id}/send - Enviar comprobante de pedido por Correo o WhatsApp */
    public function sendReceipt(string $id): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $channel = $data['channel'] ?? 'whatsapp';
        $recipient = trim($data['recipient'] ?? '');

        $stmt = $this->db->prepare('SELECT * FROM custom_orders WHERE id = :id');
        $stmt->execute(['id' => (int)$id]);
        $order = $stmt->fetch();

        if (!$order) Response::error('Pedido no encontrado.', 404);

        $textMessage = $this->generateOrderTextMessage($order);
        $htmlMessage = $this->generateOrderHTML($order);

        try {
            if ($channel === 'email') {
                $targetEmail = $recipient ?: $order['customer_email'];
                if (empty($targetEmail)) Response::error('Correo electrónico requerido.', 422);

                $mailService = new MailService();
                $mailService->sendTicket($targetEmail, "Comprobante de Pedido #{$order['order_number']}", $htmlMessage);

                Response::success("Comprobante enviado por correo a {$targetEmail}.");
            } else {
                $targetPhone = $recipient ?: $order['customer_phone'];
                $cleanPhone = preg_replace('/[^0-9]/', '', $targetPhone);
                if (strlen($cleanPhone) === 10) $cleanPhone = '52' . $cleanPhone;

                $waService = new WhatsAppService();
                $waService->sendTicket("+{$cleanPhone}", $textMessage);

                $directUrl = "https://api.whatsapp.com/send?phone={$cleanPhone}&text=" . urlencode($textMessage);
                Response::success('Comprobante preparado para WhatsApp.', [
                    'whatsapp_url' => $directUrl,
                    'phone' => $cleanPhone
                ]);
            }
        } catch (\Exception $e) {
            Response::error('Error al enviar: ' . $e->getMessage(), 500);
        }
    }

    /** Generar texto para WhatsApp */
    private function generateOrderTextMessage(array $order): string
    {
        $reqDate = date('d/m/Y H:i', strtotime($order['required_date']));
        $created = date('d/m/Y', strtotime($order['created_at']));

        $msg = "📋 *COMPROBANTE DE PEDIDO ESPECIAL*\n";
        $msg .= "--------------------------------\n";
        $msg .= "🔖 *Pedido:* #{$order['order_number']}\n";
        $msg .= "👤 *Cliente:* {$order['customer_name']}\n";
        $msg .= "📅 *Fecha de Registro:* {$created}\n";
        $msg .= "⏰ *FECHA DE ENTREGA:* {$reqDate}\n";
        $msg .= "--------------------------------\n";
        $msg .= "*DESCRIPCIÓN DEL PEDIDO:*\n";
        $msg .= "{$order['description']}\n";
        $msg .= "--------------------------------\n";
        $msg .= "💰 Total del Pedido: \${$order['total']}\n";
        $msg .= "💵 Anticipo / Garantía: \${$order['deposit_amount']}\n";
        $msg .= "🔴 *SALDO PENDIENTE AL ENTREGAR: \${$order['pending_balance']}*\n";
        $msg .= "--------------------------------\n";
        $msg .= "ℹ️ *Estado:* " . strtoupper($order['status']) . "\n";
        $msg .= "📍 *Lugar de entrega:* Tienda\n";
        $msg .= "¡Muchas gracias por su confianza! ✨";

        return $msg;
    }

    /** Generar HTML para el comprobante */
    private function generateOrderHTML(array $order): string
    {
        $reqDate = date('d/m/Y H:i', strtotime($order['required_date']));
        $created = date('d/m/Y', strtotime($order['created_at']));

        return "
        <div style='max-width:400px;margin:0 auto;font-family:sans-serif;padding:20px;border:1px solid #ddd;border-radius:12px;color:#111;'>
            <div style='text-align:center;'>
                <h2 style='color:#630ed4;margin:0;'>Comprobante de Pedido</h2>
                <p style='margin:4px 0;font-size:12px;color:#666;'>Comprobante de Pedido Personalizado</p>
                <hr style='border:none;border-top:1px dashed #ccc;margin:15px 0;'>
            </div>
            <p><strong>Pedido:</strong> #{$order['order_number']}</p>
            <p><strong>Cliente:</strong> {$order['customer_name']}</p>
            <p><strong>Teléfono:</strong> {$order['customer_phone']}</p>
            <p><strong>Fecha Registro:</strong> {$created}</p>
            <p style='background:#f3e8ff;padding:8px;border-radius:8px;'><strong>Fecha de Entrega:</strong> {$reqDate}</p>
            <div style='background:#f9fafb;padding:10px;border-radius:8px;margin:10px 0;'>
                <strong>Descripción:</strong>
                <p style='margin:5px 0 0 0;'>{$order['description']}</p>
            </div>
            <table style='width:100%;font-size:14px;margin-top:10px;'>
                <tr><td>Total:</td><td style='text-align:right;'>\${$order['total']}</td></tr>
                <tr><td>Anticipo / Garantía:</td><td style='text-align:right;color:#16a34a;'>\${$order['deposit_amount']}</td></tr>
                <tr style='font-weight:bold;font-size:16px;'><td style='padding-top:6px;'>Saldo Pendiente:</td><td style='text-align:right;padding-top:6px;color:#dc2626;'>\${$order['pending_balance']}</td></tr>
            </table>
            <hr style='border:none;border-top:1px dashed #ccc;margin:15px 0;'>
            <p style='font-size:11px;color:#666;text-align:center;'>Presente este comprobante al recoger su pedido.</p>
        </div>";
    }
}
