<?php
namespace App\services;

/**
 * Servicio de WhatsApp Business API
 * Integración con Twilio para envío de mensajes
 */
class WhatsAppService
{
    private string $accountSid;
    private string $authToken;
    private string $fromNumber;

    public function __construct()
    {
        $this->accountSid = getenv('TWILIO_ACCOUNT_SID') ?: '';
        $this->authToken = getenv('TWILIO_AUTH_TOKEN') ?: '';
        $this->fromNumber = getenv('TWILIO_WHATSAPP_FROM') ?: 'whatsapp:+14155238886'; // Sandbox number
    }

    /**
     * Enviar ticket por WhatsApp
     * @param string $to Número del destinatario con código de país (ej: +521234567890)
     * @param string $message Mensaje de texto del ticket
     * @param string|null $mediaUrl URL del PDF del ticket (opcional)
     */
    public function sendTicket(string $to, string $message, ?string $mediaUrl = null): bool
    {
        try {
            if (empty($this->accountSid) || empty($this->authToken)) {
                error_log("WhatsApp: Credenciales de Twilio no configuradas. Simulando envío.");
                return true; // En desarrollo, simular envío exitoso
            }

            $client = new \Twilio\Rest\Client($this->accountSid, $this->authToken);

            $params = [
                'from' => $this->fromNumber,
                'body' => $message,
            ];

            if ($mediaUrl) {
                $params['mediaUrl'] = [$mediaUrl];
            }

            $toFormatted = "whatsapp:{$to}";
            $client->messages->create($toFormatted, $params);

            return true;
        } catch (\Exception $e) {
            error_log("Error enviando WhatsApp: " . $e->getMessage());
            throw new \RuntimeException("Error al enviar WhatsApp: " . $e->getMessage());
        }
    }
}
