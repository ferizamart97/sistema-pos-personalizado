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
 * Controlador del Sistema de Apartados (Layaways)
 * Reglas de negocio:
 * - Anticipo mínimo del 25%
 * - Vigencia: 1 mes (30 días)
 * - Abonos semanales / periódicos con historial y tickets
 * - Vencimiento a los 30 días + Periodo de gracia de 10 días para contacto del admin
 */
class LayawayController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
        try {
            $this->db->query("ALTER TABLE layaways ADD COLUMN IF NOT EXISTS photo_url TEXT");
        } catch (\Exception $e) {
            // Ignorar si ya existe
        }
        $this->autoUpdateStatuses();
    }

    /** Actualizar automáticamente estados basados en fechas (30 días y 10 días de gracia) */
    private function autoUpdateStatuses(): void
    {
        // Pasar a 'vencido' los apartados que superaron los 30 días y aún tienen saldo
        $this->db->query("
            UPDATE layaways 
            SET status = 'vencido' 
            WHERE status = 'activo' 
              AND expiration_date < CURRENT_DATE 
              AND remaining_balance > 0
        ");

        // Pasar a 'gracia_10_dias' si ya venció y está dentro de los 10 días adicionales
        $this->db->query("
            UPDATE layaways 
            SET status = 'gracia_10_dias' 
            WHERE status = 'vencido' 
              AND CURRENT_DATE <= grace_period_end_date 
              AND admin_contacted = true
        ");
    }

    /** GET /api/layaways - Listar apartados con filtros */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $status = $_GET['status'] ?? '';
        $query = '
            SELECT l.*, u.name as seller_name,
                   (SELECT COUNT(*) FROM layaway_payments lp WHERE lp.layaway_id = l.id) as payments_count
            FROM layaways l
            LEFT JOIN users u ON u.id = l.user_id
            WHERE 1=1
        ';
        $params = [];

        if (!empty($status)) {
            $query .= ' AND l.status = :status';
            $params['status'] = $status;
        }

        $query .= ' ORDER BY l.expiration_date ASC';

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $layaways = $stmt->fetchAll();

        // Cargar items y abonos de cada apartado
        foreach ($layaways as &$layaway) {
            $itemStmt = $this->db->prepare('SELECT * FROM layaway_items WHERE layaway_id = :id');
            $itemStmt->execute(['id' => $layaway['id']]);
            $layaway['items'] = $itemStmt->fetchAll();

            $payStmt = $this->db->prepare('SELECT * FROM layaway_payments WHERE layaway_id = :id ORDER BY created_at ASC');
            $payStmt->execute(['id' => $layaway['id']]);
            $layaway['payments'] = $payStmt->fetchAll();
        }

        Response::success('Apartados obtenidos.', $layaways);
    }

    /** GET /api/layaways/{id} - Detalle completo de apartado */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare('SELECT l.*, u.name as seller_name FROM layaways l LEFT JOIN users u ON u.id = l.user_id WHERE l.id = :id');
        $stmt->execute(['id' => (int)$id]);
        $layaway = $stmt->fetch();

        if (!$layaway) Response::error('Apartado no encontrado.', 404);

        $itemStmt = $this->db->prepare('SELECT * FROM layaway_items WHERE layaway_id = :id');
        $itemStmt->execute(['id' => $layaway['id']]);
        $layaway['items'] = $itemStmt->fetchAll();

        $payStmt = $this->db->prepare('SELECT * FROM layaway_payments WHERE layaway_id = :id ORDER BY created_at ASC');
        $payStmt->execute(['id' => $layaway['id']]);
        $layaway['payments'] = $payStmt->fetchAll();

        Response::success('Detalle de apartado.', $layaway);
    }

    /** POST /api/layaways - Crear nuevo apartado (valida 25% mínimo) */
    public function store(): void
    {
        $user = AuthMiddleware::authenticate();
        $userId = is_array($user) ? $user['user_id'] : ($user->user_id ?? 1);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['customer_name']) || empty($data['customer_phone']) || empty($data['items']) || !is_array($data['items'])) {
            Response::error('Nombre del cliente, teléfono y lista de productos son obligatorios.', 422);
        }

        $totalAmount = (float)($data['total_amount'] ?? 0);
        $initialDeposit = (float)($data['initial_deposit'] ?? 0);

        // Validación de regla de negocio: Mínimo 25% de anticipo
        $minRequiredDeposit = round($totalAmount * 0.25, 2);
        if ($initialDeposit < $minRequiredDeposit) {
            Response::error("El anticipo mínimo requerido es del 25% (\${$minRequiredDeposit}). Monto ingresado: \${$initialDeposit}", 422);
        }

        $this->db->beginTransaction();
        try {
            // Generar Folio: APT-YYYYMMDD-NNN
            $dateStr = date('Ymd');
            $countStmt = $this->db->prepare("SELECT COUNT(*) FROM layaways WHERE folio LIKE :prefix");
            $countStmt->execute(['prefix' => "APT-{$dateStr}-%"]);
            $seq = (int)$countStmt->fetchColumn() + 1;
            $folio = sprintf('APT-%s-%03d', $dateStr, $seq);

            $startDate = date('Y-m-d');
            $expDate = date('Y-m-d', strtotime('+30 days'));
            $graceDate = date('Y-m-d', strtotime('+40 days')); // 30d + 10d gracia
            $remaining = max(0, $totalAmount - $initialDeposit);

            $photoUrl = !empty($data['photo_url']) ? trim($data['photo_url']) : null;

            $stmt = $this->db->prepare('
                INSERT INTO layaways (
                    folio, user_id, customer_name, customer_phone, customer_email,
                    total_amount, initial_deposit, total_paid, remaining_balance,
                    start_date, expiration_date, grace_period_end_date, status, photo_url
                )
                VALUES (
                    :folio, :user_id, :c_name, :c_phone, :c_email,
                    :total, :deposit, :paid, :rem,
                    :sdate, :edate, :gdate, \'activo\', :photo
                )
                RETURNING *
            ');

            $stmt->execute([
                'folio' => $folio,
                'user_id' => $userId,
                'c_name' => trim($data['customer_name']),
                'c_phone' => trim($data['customer_phone']),
                'c_email' => !empty($data['customer_email']) ? trim($data['customer_email']) : null,
                'total' => $totalAmount,
                'deposit' => $initialDeposit,
                'paid' => $initialDeposit,
                'rem' => $remaining,
                'sdate' => $startDate,
                'edate' => $expDate,
                'gdate' => $graceDate,
                'photo' => $photoUrl
            ]);
            $layaway = $stmt->fetch();

            // Insertar items apartados
            $itemStmt = $this->db->prepare('
                INSERT INTO layaway_items (layaway_id, product_id, product_name, quantity, unit_price, subtotal)
                VALUES (:lid, :pid, :pname, :qty, :price, :subtotal)
            ');
            foreach ($data['items'] as $item) {
                $itemStmt->execute([
                    'lid' => $layaway['id'],
                    'pid' => !empty($item['product_id']) ? (int)$item['product_id'] : null,
                    'pname' => trim($item['product_name']),
                    'qty' => (float)$item['quantity'],
                    'price' => (float)$item['unit_price'],
                    'subtotal' => (float)($item['quantity'] * $item['unit_price'])
                ]);
            }

            // Registrar el primer abono (anticipo) en layaway_payments
            $receiptNum = sprintf('ABN-%s-%03d-1', $dateStr, $seq);
            $payStmt = $this->db->prepare('
                INSERT INTO layaway_payments (layaway_id, user_id, receipt_number, amount, payment_method, previous_balance, new_balance, notes)
                VALUES (:lid, :uid, :rnum, :amt, :method, :prev, :new, :notes)
            ');
            $payStmt->execute([
                'lid' => $layaway['id'],
                'uid' => $userId,
                'rnum' => $receiptNum,
                'amt' => $initialDeposit,
                'method' => $data['payment_method'] ?? 'efectivo',
                'prev' => $totalAmount,
                'new' => $remaining,
                'notes' => 'Anticipo inicial de apartado (Mínimo 25% cubierto)'
            ]);

            $this->db->commit();

            // Generar mensaje WhatsApp
            $waMessage = $this->generateLayawayTextMessage($layaway, $data['items'], $initialDeposit);
            $cleanPhone = preg_replace('/[^0-9]/', '', $layaway['customer_phone']);
            if (strlen($cleanPhone) === 10) $cleanPhone = '52' . $cleanPhone;
            $directUrl = "https://api.whatsapp.com/send?phone={$cleanPhone}&text=" . urlencode($waMessage);

            Response::success('Apartado registrado exitosamente con 30 días de vigencia.', [
                'layaway' => $layaway,
                'whatsapp_url' => $directUrl,
                'whatsapp_message' => $waMessage
            ], 201);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error al registrar apartado: ' . $e->getMessage(), 500);
        }
    }

    /** POST /api/layaways/{id}/payments - Registrar abono parcial (semanal/periódico) */
    public function addPayment(string $id): void
    {
        $user = AuthMiddleware::authenticate();
        $userId = is_array($user) ? $user['user_id'] : ($user->user_id ?? 1);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $amount = (float)($data['amount'] ?? 0);
        if ($amount <= 0) Response::error('El monto del abono debe ser mayor a 0.', 422);

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT * FROM layaways WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => (int)$id]);
            $layaway = $stmt->fetch();

            if (!$layaway) {
                $this->db->rollBack();
                Response::error('Apartado no encontrado.', 404);
            }

            if ($layaway['status'] === 'cancelado') {
                $this->db->rollBack();
                Response::error('Este apartado ha sido cancelado.', 400);
            }

            if ($layaway['remaining_balance'] <= 0) {
                $this->db->rollBack();
                Response::error('Este apartado ya se encuentra totalmente liquidado.', 400);
            }

            $prevBalance = (float)$layaway['remaining_balance'];
            $actualAmount = min($amount, $prevBalance);
            $newBalance = max(0, $prevBalance - $actualAmount);
            $newTotalPaid = (float)$layaway['total_paid'] + $actualAmount;
            $isFullyPaid = ($newBalance <= 0);

            // Generar número de recibo de abono
            $dateStr = date('Ymd');
            $countStmt = $this->db->prepare("SELECT COUNT(*) FROM layaway_payments WHERE receipt_number LIKE :prefix");
            $countStmt->execute(['prefix' => "ABN-{$dateStr}-%"]);
            $seq = (int)$countStmt->fetchColumn() + 1;
            $receiptNum = sprintf('ABN-%s-%03d', $dateStr, $seq);

            // Registrar abono
            $payStmt = $this->db->prepare('
                INSERT INTO layaway_payments (layaway_id, user_id, receipt_number, amount, payment_method, previous_balance, new_balance, notes)
                VALUES (:lid, :uid, :rnum, :amt, :method, :prev, :new, :notes)
                RETURNING *
            ');
            $payStmt->execute([
                'lid' => $layaway['id'],
                'uid' => $userId,
                'rnum' => $receiptNum,
                'amt' => $actualAmount,
                'method' => $data['payment_method'] ?? 'efectivo',
                'prev' => $prevBalance,
                'new' => $newBalance,
                'notes' => $data['notes'] ?? ($isFullyPaid ? 'Liquidación total del apartado' : 'Abono parcial al apartado')
            ]);
            $paymentRecord = $payStmt->fetch();

            // Actualizar apartado
            $newStatus = $isFullyPaid ? 'liquidado' : $layaway['status'];
            $updateStmt = $this->db->prepare('
                UPDATE layaways 
                SET total_paid = :paid,
                    remaining_balance = :rem,
                    status = :status
                WHERE id = :id
                RETURNING *
            ');
            $updateStmt->execute([
                'paid' => $newTotalPaid,
                'rem' => $newBalance,
                'status' => $newStatus,
                'id' => $layaway['id']
            ]);
            $updatedLayaway = $updateStmt->fetch();

            $this->db->commit();

            // Mensaje de abono para WhatsApp
            $waMessage = $this->generatePaymentTextMessage($updatedLayaway, $paymentRecord);
            $cleanPhone = preg_replace('/[^0-9]/', '', $updatedLayaway['customer_phone']);
            if (strlen($cleanPhone) === 10) $cleanPhone = '52' . $cleanPhone;
            $directUrl = "https://api.whatsapp.com/send?phone={$cleanPhone}&text=" . urlencode($waMessage);

            Response::success($isFullyPaid ? '¡Apartado liquidado al 100%!' : 'Abono registrado con éxito.', [
                'layaway' => $updatedLayaway,
                'payment' => $paymentRecord,
                'is_liquidated' => $isFullyPaid,
                'whatsapp_url' => $directUrl,
                'whatsapp_message' => $waMessage
            ]);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error al registrar abono: ' . $e->getMessage(), 500);
        }
    }

    /** PATCH /api/layaways/{id}/contact - Marcar que el administrador contactó al cliente por vencimiento */
    public function markContacted(string $id): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $this->db->prepare('
            UPDATE layaways 
            SET admin_contacted = true,
                admin_contacted_at = NOW(),
                admin_notes = :notes,
                status = \'gracia_10_dias\'
            WHERE id = :id
            RETURNING *
        ');
        $stmt->execute([
            'notes' => $data['notes'] ?? 'Contacto realizado con el cliente por vencimiento de apartado.',
            'id' => (int)$id
        ]);

        $res = $stmt->fetch();
        if (!$res) Response::error('Apartado no encontrado.', 404);

        Response::success('Se registró el contacto y se activó el periodo de 10 días de gracia.', $res);
    }

    /** PUT /api/layaways/{id}/cancel - Cancelar apartado */
    public function cancel(string $id): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $this->db->prepare('
            UPDATE layaways 
            SET status = \'cancelado\',
                admin_notes = :notes
            WHERE id = :id
            RETURNING *
        ');
        $stmt->execute([
            'notes' => $data['notes'] ?? 'Apartado cancelado por vencimiento o decisión del administrador.',
            'id' => (int)$id
        ]);

        $res = $stmt->fetch();
        if (!$res) Response::error('Apartado no encontrado.', 404);

        Response::success('Apartado cancelado.', $res);
    }

    /** Mensaje de creación de apartado */
    private function generateLayawayTextMessage(array $layaway, array $items, float $deposit): string
    {
        $startDate = date('d/m/Y', strtotime($layaway['start_date']));
        $expDate = date('d/m/Y', strtotime($layaway['expiration_date']));

        $msg = "🎁 *COMPROBANTE DE APARTADO*\n";
        $msg .= "--------------------------------\n";
        $msg .= "🏷️ *Folio de Apartado:* #{$layaway['folio']}\n";
        $msg .= "👤 *Cliente:* {$layaway['customer_name']}\n";
        $msg .= "📅 *Fecha de Inicio:* {$startDate}\n";
        $msg .= "⏳ *VIGENCIA DE APARTADO:* 1 MES ({$expDate})\n";
        $msg .= "--------------------------------\n";
        $msg .= "*PRODUCTOS APARTADOS:*\n";
        foreach ($items as $it) {
            $name = $it['product_name'] ?? $it['name'];
            $msg .= "• {$it['quantity']}x {$name} (\${$it['subtotal']})\n";
        }
        $msg .= "--------------------------------\n";
        $msg .= "💰 Total de Mercancía: \${$layaway['total_amount']}\n";
        $msg .= "💵 Anticipo Inicial (≥25%): \${$deposit}\n";
        $msg .= "🔴 *SALDO RESTANTE: \${$layaway['remaining_balance']}*\n";
        $msg .= "--------------------------------\n";
        $msg .= "📌 *Condiciones:* Puede realizar abonos semanales en caja. Los apartados tienen vigencia estricta de 30 días.\n";
        $msg .= "¡Gracias por su preferencia! ✨";

        return $msg;
    }

    /** Mensaje de confirmación de abono parcial */
    private function generatePaymentTextMessage(array $layaway, array $payment): string
    {
        $payDate = date('d/m/Y H:i', strtotime($payment['created_at']));
        $expDate = date('d/m/Y', strtotime($layaway['expiration_date']));

        $msg = "💵 *RECIBO DE ABONO A APARTADO*\n";
        $msg .= "--------------------------------\n";
        $msg .= "🧾 *Recibo #:* {$payment['receipt_number']}\n";
        $msg .= "🏷️ *Folio Apartado:* #{$layaway['folio']}\n";
        $msg .= "👤 *Cliente:* {$layaway['customer_name']}\n";
        $msg .= "📅 *Fecha del Abono:* {$payDate}\n";
        $msg .= "--------------------------------\n";
        $msg .= "💸 *Monto Abonado:* \${$payment['amount']}\n";
        $msg .= "📊 Saldo Anterior: \${$payment['previous_balance']}\n";
        $msg .= "🟢 Total Pagado Acumulado: \${$layaway['total_paid']}\n";
        $msg .= "🔴 *NUEVO SALDO RESTANTE: \${$layaway['remaining_balance']}*\n";
        $msg .= "--------------------------------\n";

        if ((float)$layaway['remaining_balance'] <= 0) {
            $msg .= "🎉 *¡FELICIDADES! SU APARTADO ESTÁ TOTALMENTE LIQUIDADO.*\n";
            $msg .= "Puede pasar a tienda a recoger sus productos con este comprobante.\n";
        } else {
            $msg .= "⏳ *Fecha límite de liquidación:* {$expDate}\n";
        }

        $msg .= "¡Muchas gracias por su preferencia! ✨";
        return $msg;
    }
}
