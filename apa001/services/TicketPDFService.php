<?php
namespace App\services;

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Servicio de generación de tickets en PDF
 * Formato optimizado para comprobantes térmicos de 80mm
 */
class TicketPDFService
{
    /**
     * Generar PDF del ticket a partir de datos estructurados o HTML
     */
    public function generate(array $sale, array $details, array $settings): string
    {
        $businessName = $settings['business_name'] ?? getenv('BUSINESS_NAME') ?: 'Mi Tienda';
        $businessAddress = $settings['business_address'] ?? 'Av. Principal #123, Col. Centro';
        $businessPhone = $settings['business_phone'] ?? '55-1234-5678';
        $footer = $settings['ticket_footer'] ?? '¡Gracias por su preferencia!';
        $date = date('d/m/Y H:i', strtotime($sale['created_at'] ?? 'now'));
        $ticketNo = $sale['ticket_number'] ?? 'T-001';
        $seller = $sale['seller_name'] ?? 'Caja 1';
        $method = strtoupper($sale['payment_method'] ?? 'Efectivo');
        $subtotal = number_format((float)($sale['subtotal'] ?? 0), 2);
        $discount = (float)($sale['discount'] ?? 0);
        $total = number_format((float)($sale['total'] ?? 0), 2);

        $itemsRows = '';
        foreach ($details as $it) {
            $qty = $it['quantity'];
            $name = htmlspecialchars($it['product_name'] ?? 'Producto');
            $price = number_format((float)($it['unit_price'] ?? 0), 2);
            $sub = number_format((float)($it['subtotal'] ?? 0), 2);
            $itemsRows .= "
            <tr>
                <td style='padding: 3px 0; text-align: left; font-size: 10px;'>
                    <strong>{$qty}x</strong> {$name}<br>
                    <span style='color: #666; font-size: 9px;'>\${$price} c/u</span>
                </td>
                <td style='padding: 3px 0; text-align: right; vertical-align: top; font-size: 10px; font-weight: bold;'>
                    \${$sub}
                </td>
            </tr>";
        }

        $discountRow = '';
        if ($discount > 0) {
            $discFormatted = number_format($discount, 2);
            $discountRow = "
            <tr>
                <td style='color: #ba1a1a; font-size: 10px;'>Descuento:</td>
                <td style='text-align: right; color: #ba1a1a; font-size: 10px; font-weight: bold;'>-\${$discFormatted}</td>
            </tr>";
        }

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                @page {
                    size: 80mm 200mm;
                    margin: 4mm 4mm 4mm 4mm;
                }
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    font-size: 10px;
                    color: #111;
                    line-height: 1.3;
                    margin: 0;
                    padding: 0;
                }
                .ticket-box {
                    width: 100%;
                    text-align: center;
                }
                .header-title {
                    font-size: 15px;
                    font-weight: 900;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .header-subtitle {
                    font-size: 9px;
                    color: #555;
                    margin: 2px 0;
                }
                .divider {
                    border: none;
                    border-top: 1px dashed #777;
                    margin: 6px 0;
                }
                .meta-table, .items-table, .totals-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .meta-table td {
                    font-size: 9.5px;
                    padding: 1.5px 0;
                }
                .items-table th {
                    font-size: 9px;
                    text-transform: uppercase;
                    border-bottom: 1px dashed #999;
                    padding-bottom: 3px;
                }
                .total-amount {
                    font-size: 14px;
                    font-weight: 900;
                }
                .footer-text {
                    font-size: 9px;
                    color: #555;
                    margin-top: 6px;
                }
                .barcode-box {
                    margin-top: 8px;
                    text-align: center;
                    letter-spacing: 4px;
                    font-family: monospace;
                    font-size: 11px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class='ticket-box'>
                <div class='header-title'>{$businessName}</div>
                <div class='header-subtitle'>{$businessAddress}</div>
                <div class='header-subtitle'>Tel: {$businessPhone}</div>
                
                <hr class='divider'>

                <table class='meta-table'>
                    <tr>
                        <td style='text-align: left;'><strong>Folio:</strong> {$ticketNo}</td>
                        <td style='text-align: right;'>{$date}</td>
                    </tr>
                    <tr>
                        <td style='text-align: left;'><strong>Atendió:</strong> {$seller}</td>
                        <td style='text-align: right;'><strong>Pago:</strong> {$method}</td>
                    </tr>
                </table>

                <hr class='divider'>

                <table class='items-table'>
                    <thead>
                        <tr>
                            <th style='text-align: left;'>Cant. / Concepto</th>
                            <th style='text-align: right;'>Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$itemsRows}
                    </tbody>
                </table>

                <hr class='divider'>

                <table class='totals-table'>
                    <tr>
                        <td style='text-align: left; font-size: 10px;'>Subtotal:</td>
                        <td style='text-align: right; font-size: 10px;'>\${$subtotal}</td>
                    </tr>
                    {$discountRow}
                    <tr style='border-top: 1px solid #222;'>
                        <td style='text-align: left; font-size: 12px; font-weight: 900; padding-top: 4px;'>TOTAL A PAGAR:</td>
                        <td style='text-align: right; font-size: 13px; font-weight: 900; padding-top: 4px;' class='total-amount'>\${$total}</td>
                    </tr>
                </table>

                <hr class='divider'>

                <div class='footer-text'>
                    <strong>{$footer}</strong><br>
                    Conserve este ticket como comprobante oficial.
                </div>

                <div class='barcode-box'>
                    ||| | |||| | ||| |||| | |<br>
                    <span style='font-size: 8px; letter-spacing: 1px;'>{$ticketNo}</span>
                </div>
            </div>
        </body>
        </html>";

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper([0, 0, 226.77, 600]); // 80mm width
        $dompdf->render();

        return $dompdf->output();
    }

    /** Guardar PDF generado en archivo temporal para adjuntos de correo */
    public function saveToFile(array $sale, array $details, array $settings): string
    {
        $pdfContent = $this->generate($sale, $details, $settings);
        $ticketNo = preg_replace('/[^a-zA-Z0-9_-]/', '', $sale['ticket_number'] ?? 'ticket');
        $path = sys_get_temp_dir() . "/ticket_{$ticketNo}_" . time() . ".pdf";
        file_put_contents($path, $pdfContent);
        return $path;
    }
}
