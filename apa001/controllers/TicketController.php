<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../services/MailService.php';
require_once __DIR__ . '/../services/WhatsAppService.php';
require_once __DIR__ . '/../services/TicketPDFService.php';

use App\middleware\AuthMiddleware;
use App\helpers\Response;
use App\services\MailService;
use App\services\WhatsAppService;
use App\services\TicketPDFService;
use Database;

/**
 * Controlador de Tickets
 * Genera, visualiza, descarga en PDF y envía tickets de venta por Correo, WhatsApp e Impresión Térmica
 */
class TicketController
{
    private \PDO $db;
    private TicketPDFService $pdfService;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->pdfService = new TicketPDFService();
    }

    /** GET /api/tickets/{saleId} - Obtener datos del ticket de una venta */
    public function show(string $saleId): void
    {
        AuthMiddleware::authenticate();

        $sale = $this->getSaleData($saleId);
        if (!$sale) Response::error('Venta no encontrada.', 404);

        $details = $this->getSaleDetails($saleId);
        $settings = $this->getSettings();

        $html = $this->generateTicketHTML($sale, $details, $settings);
        $text = $this->generateTicketText($sale, $details, $settings);

        // Actualizar contenido en tabla tickets si existe
        $this->db->prepare('UPDATE tickets SET content_html = :html WHERE sale_id = :sale_id')
            ->execute(['html' => $html, 'sale_id' => $saleId]);

        Response::success('Ticket generado.', [
            'ticket_number' => $sale['ticket_number'],
            'html' => $html,
            'text' => $text,
            'pdf_url' => "/api/tickets/{$saleId}/pdf",
            'sale' => $sale,
            'details' => $details,
        ]);
    }

    /** GET /api/tickets/{saleId}/pdf - Descargar o visualizar el PDF del ticket */
    public function pdf(string $saleId): void
    {
        $sale = $this->getSaleData($saleId);
        if (!$sale) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Error: Ticket de venta no encontrado.';
            exit();
        }

        $details = $this->getSaleDetails($saleId);
        $settings = $this->getSettings();

        $pdfBinary = $this->pdfService->generate($sale, $details, $settings);
        $ticketNo = preg_replace('/[^a-zA-Z0-9_-]/', '', $sale['ticket_number'] ?? 'ticket');

        header('Content-Type: application/pdf');
        header("Content-Disposition: inline; filename=\"Ticket_{$ticketNo}.pdf\"");
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        echo $pdfBinary;
        exit();
    }

    /** POST /api/tickets/{saleId}/send - Enviar ticket por Email, WhatsApp o Impresión */
    public function send(string $saleId): void
    {
        AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $channel = $data['channel'] ?? 'print'; // email, whatsapp, print
        $recipient = trim($data['recipient'] ?? '');

        $sale = $this->getSaleData($saleId);
        if (!$sale) Response::error('Venta no encontrada.', 404);

        $details = $this->getSaleDetails($saleId);
        $settings = $this->getSettings();

        $html = $this->generateTicketHTML($sale, $details, $settings);
        $text = $this->generateTicketText($sale, $details, $settings);

        // Asegurar registro en tickets
        $ticketStmt = $this->db->prepare('SELECT id FROM tickets WHERE sale_id = :id');
        $ticketStmt->execute(['id' => $saleId]);
        $ticket = $ticketStmt->fetch();

        try {
            switch ($channel) {
                case 'email':
                    if (empty($recipient) || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
                        Response::error('Email del destinatario inválido.', 422);
                    }

                    // Generar archivo PDF temporal para adjuntar
                    $tempPdfPath = $this->pdfService->saveToFile($sale, $details, $settings);

                    $mailService = new MailService();
                    $subject = "Comprobante de Compra #{$sale['ticket_number']}";
                    $mailService->sendTicket($recipient, $subject, $html, $tempPdfPath);

                    // Eliminar archivo temporal
                    if (file_exists($tempPdfPath)) {
                        @unlink($tempPdfPath);
                    }

                    if ($ticket) {
                        $this->db->prepare(
                            'UPDATE tickets SET sent_via = :via, sent_to = :to, status = :status WHERE id = :id'
                        )->execute(['via' => 'email', 'to' => $recipient, 'status' => 'enviado', 'id' => $ticket['id']]);
                    }

                    Response::success("Ticket en PDF enviado exitosamente a {$recipient}.");
                    break;

                case 'whatsapp':
                    if (empty($recipient)) Response::error('Número de WhatsApp requerido.', 422);

                    $cleanPhone = preg_replace('/[^0-9]/', '', $recipient);
                    if (strlen($cleanPhone) === 10) {
                        $cleanPhone = '52' . $cleanPhone;
                    }

                    $pdfUrl = $this->getBaseUrl() . "/api/tickets/{$saleId}/pdf";

                    $waService = new WhatsAppService();
                    $waService->sendTicket("+{$cleanPhone}", $text, $pdfUrl);

                    if ($ticket) {
                        $this->db->prepare(
                            'UPDATE tickets SET sent_via = :via, sent_to = :to, status = :status WHERE id = :id'
                        )->execute(['via' => 'whatsapp', 'to' => $recipient, 'status' => 'enviado', 'id' => $ticket['id']]);
                    }

                    // Generar enlace directo de WhatsApp
                    $directUrl = "https://api.whatsapp.com/send?phone={$cleanPhone}&text=" . urlencode($text);

                    Response::success('Ticket enviado por WhatsApp.', [
                        'whatsapp_url' => $directUrl,
                        'pdf_url' => "/api/tickets/{$saleId}/pdf",
                        'phone' => $cleanPhone
                    ]);
                    break;

                case 'print':
                default:
                    if ($ticket) {
                        $this->db->prepare(
                            'UPDATE tickets SET sent_via = :via, status = :status WHERE id = :id'
                        )->execute(['via' => 'print', 'status' => 'enviado', 'id' => $ticket['id']]);
                    }

                    Response::success('Ticket listo para imprimir.', [
                        'html' => $html,
                        'pdf_url' => "/api/tickets/{$saleId}/pdf"
                    ]);
                    break;
            }
        } catch (\Exception $e) {
            if ($ticket) {
                $this->db->prepare('UPDATE tickets SET status = :status WHERE id = :id')
                    ->execute(['status' => 'error', 'id' => $ticket['id']]);
            }
            Response::error('Error al procesar envío: ' . $e->getMessage(), 500);
        }
    }

    private function getSaleData(string $saleId): ?array
    {
        $saleStmt = $this->db->prepare(
            'SELECT s.*, u.name as seller_name FROM sales s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = :id'
        );
        $saleStmt->execute(['id' => $saleId]);
        $sale = $saleStmt->fetch();
        return $sale ?: null;
    }

    private function getSaleDetails(string $saleId): array
    {
        $detailStmt = $this->db->prepare('SELECT * FROM sale_details WHERE sale_id = :id');
        $detailStmt->execute(['id' => $saleId]);
        return $detailStmt->fetchAll() ?: [];
    }

    /** Generar HTML formateado para ticket de 80mm */
    private function generateTicketHTML(array $sale, array $details, array $settings): string
    {
        $businessName = $settings['business_name'] ?? getenv('BUSINESS_NAME') ?: 'Mi Tienda';
        $businessAddress = $settings['business_address'] ?? 'Av. Principal #123, Col. Centro';
        $businessPhone = $settings['business_phone'] ?? '55-1234-5678';
        $footer = $settings['ticket_footer'] ?? '¡Gracias por su preferencia!';
        $date = date('d/m/Y H:i', strtotime($sale['created_at'] ?? 'now'));

        $itemsHtml = '';
        foreach ($details as $item) {
            $itemsHtml .= "<tr>
                <td style='text-align:left;font-size:11px;padding:3px 0;'><strong>{$item['quantity']}x</strong> {$item['product_name']}</td>
                <td style='text-align:right;font-size:11px;padding:3px 0;'>\${$item['unit_price']}</td>
                <td style='text-align:right;font-size:11px;padding:3px 0;font-weight:bold;'>\${$item['subtotal']}</td>
            </tr>";
        }

        $discountHtml = '';
        if ((float)($sale['discount'] ?? 0) > 0) {
            $discountHtml = "<tr><td style='color:#ba1a1a;'>Descuento:</td><td colspan='2' style='text-align:right;color:#ba1a1a;font-weight:bold;'>-\${$sale['discount']}</td></tr>";
        }

        return "
        <div id='ticket-print-area' style='width:300px;margin:0 auto;font-family:monospace;padding:15px;background:#fff;border:1px dashed #bbb;color:#111;text-align:left;'>
            <div style='text-align:center;'>
                <h2 style='margin:0;font-size:18px;font-weight:900;'>{$businessName}</h2>
                <p style='margin:2px 0;font-size:11px;color:#555;'>{$businessAddress}</p>
                <p style='margin:2px 0;font-size:11px;color:#555;'>Tel: {$businessPhone}</p>
                <hr style='border:none;border-top:1px dashed #888;margin:10px 0;'>
            </div>
            <p style='font-size:11px;margin:3px 0;'><strong>Ticket:</strong> #{$sale['ticket_number']}</p>
            <p style='font-size:11px;margin:3px 0;'><strong>Fecha:</strong> {$date}</p>
            <p style='font-size:11px;margin:3px 0;'><strong>Vendedor:</strong> {$sale['seller_name']}</p>
            <p style='font-size:11px;margin:3px 0;'><strong>Método:</strong> " . strtoupper($sale['payment_method'] ?? 'Efectivo') . "</p>
            <hr style='border:none;border-top:1px dashed #888;margin:10px 0;'>
            <table style='width:100%;border-collapse:collapse;'>
                <thead>
                    <tr style='border-bottom:1px solid #222;'>
                        <th style='text-align:left;font-size:10px;padding-bottom:4px;'>Cant. Producto</th>
                        <th style='text-align:right;font-size:10px;padding-bottom:4px;'>P.U</th>
                        <th style='text-align:right;font-size:10px;padding-bottom:4px;'>Importe</th>
                    </tr>
                </thead>
                <tbody>{$itemsHtml}</tbody>
            </table>
            <hr style='border:none;border-top:1px dashed #888;margin:10px 0;'>
            <table style='width:100%;font-size:12px;'>
                <tr><td>Subtotal:</td><td colspan='2' style='text-align:right;'>\${$sale['subtotal']}</td></tr>
                {$discountHtml}
                <tr style='font-weight:bold;font-size:15px;'><td style='padding-top:6px;'>TOTAL:</td><td colspan='2' style='text-align:right;padding-top:6px;'>\${$sale['total']}</td></tr>
            </table>
            <hr style='border:none;border-top:1px dashed #888;margin:10px 0;'>
            <p style='text-align:center;font-size:11px;margin:4px 0;font-weight:bold;'>{$footer}</p>
            <p style='text-align:center;font-size:9px;color:#777;'>Conserve este ticket para cualquier aclaración</p>
        </div>";
    }

    /** Generar mensaje formateado para WhatsApp */
    private function generateTicketText(array $sale, array $details, array $settings): string
    {
        $businessName = $settings['business_name'] ?? getenv('BUSINESS_NAME') ?: 'Mi Tienda';
        $date = date('d/m/Y H:i', strtotime($sale['created_at'] ?? 'now'));
        $ticketNo = $sale['ticket_number'] ?? 'T-001';
        $total = number_format((float)($sale['total'] ?? 0), 2);

        $pdfUrl = $this->getBaseUrl() . "/api/tickets/{$sale['id']}/pdf";

        $msg = "📄 *COMPROBANTE DE COMPRA EN PDF - {$businessName}*\n";
        $msg .= "--------------------------------\n";
        $msg .= "🧾 *Ticket:* #{$ticketNo}\n";
        $msg .= "📅 *Fecha:* {$date}\n";
        $msg .= "💳 *Método:* " . strtoupper($sale['payment_method'] ?? 'Efectivo') . "\n";
        $msg .= "👤 *Atendió:* {$sale['seller_name']}\n";
        $msg .= "--------------------------------\n";
        $msg .= "*PRODUCTOS:*\n";

        foreach ($details as $item) {
            $msg .= "• {$item['quantity']}x {$item['product_name']} (\${$item['subtotal']})\n";
        }

        $msg .= "--------------------------------\n";
        $msg .= "Subtotal: \${$sale['subtotal']}\n";
        if ((float)($sale['discount'] ?? 0) > 0) {
            $msg .= "Descuento: -\${$sale['discount']}\n";
        }
        $msg .= "*TOTAL COBRADO: \${$total}*\n";
        $msg .= "--------------------------------\n";
        $msg .= "📥 *DESCARGUE SU TICKET EN PDF:*\n";
        $msg .= "{$pdfUrl}\n";
        $msg .= "--------------------------------\n";
        $msg .= "¡Muchas gracias por su preferencia! ✨";

        return $msg;
    }

    /** Obtener la URL base dinámica según el ambiente (Prod, Staging, Dev o Local) */
    private function getBaseUrl(): string
    {
        // 1. Variable de entorno configurada explícitamente en el ambiente (.env)
        $envUrl = getenv('APP_URL') ?: getenv('API_URL');
        if (!empty($envUrl)) {
            return rtrim($envUrl, '/');
        }

        // 2. Detección automática por headers (Traefik, Nginx, Cloudflare o directo)
        $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost:8080';
        
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
            || (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on');
            
        $scheme = $isHttps ? 'https' : 'http';

        // Si es localhost o IP local sin proxy, forzar http
        if (str_contains($host, 'localhost') || str_contains($host, '127.0.0.1')) {
            $scheme = 'http';
        }

        return "{$scheme}://{$host}";
    }

    /** Obtener configuración del negocio */
    private function getSettings(): array
    {
        $stmt = $this->db->query("SELECT key_, value_ FROM settings");
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['key_']] = $row['value_'];
        }
        return $settings;
    }
}
