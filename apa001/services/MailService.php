<?php
namespace App\services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Servicio de envío de correos electrónicos
 * Utiliza PHPMailer para enviar tickets por email
 */
class MailService
{
    private PHPMailer $mailer;

    public function __construct()
    {
        $config = require __DIR__ . '/../config/mail.php';

        $this->mailer = new PHPMailer(true);
        $this->mailer->isSMTP();
        $this->mailer->Host = $config['host'];
        $this->mailer->Port = $config['port'];
        $this->mailer->CharSet = 'UTF-8';

        if (!empty($config['username'])) {
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = $config['username'];
            $this->mailer->Password = $config['password'];
        }

        if (!empty($config['encryption'])) {
            $this->mailer->SMTPSecure = $config['encryption'];
        } else {
            $this->mailer->SMTPAutoTLS = false;
        }

        $this->mailer->setFrom($config['from_address'], $config['from_name']);
    }

    /**
     * Enviar ticket de venta por correo electrónico
     */
    public function sendTicket(string $to, string $subject, string $htmlContent, ?string $pdfPath = null): bool
    {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
            $this->mailer->addAddress($to);
            $this->mailer->isHTML(true);
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $htmlContent;
            $this->mailer->AltBody = strip_tags($htmlContent);

            if ($pdfPath && file_exists($pdfPath)) {
                $this->mailer->addAttachment($pdfPath, 'ticket.pdf');
            }

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Error enviando email: " . $e->getMessage());
            throw new \RuntimeException("Error al enviar email: " . $e->getMessage());
        }
    }
}
