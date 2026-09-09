<?php
/**
 * Configuración de CORS (Cross-Origin Resource Sharing)
 * Permite peticiones seguras desde navegadores de escritorio, tabletas y móviles
 */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!empty($origin)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Max-Age: 86400");

// Responder de inmediato a las peticiones Preflight (OPTIONS)
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
