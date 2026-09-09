<?php
/**
 * Sistema POS - Entry Point / Router Principal
 * Todas las peticiones HTTP son enrutadas aquí por .htaccess
 */

// Cargar autoload de Composer
require_once __DIR__ . '/../vendor/autoload.php';

// Cargar variables de entorno
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        if (str_contains($line, '=')) {
            putenv(trim($line));
            [$key, $value] = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Configurar CORS
require_once __DIR__ . '/../config/cors.php';

// Manejar peticiones OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Obtener método y URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Eliminar trailing slash (excepto para /)
$uri = $uri !== '/' ? rtrim($uri, '/') : $uri;

// Cargar rutas
$routes = require_once __DIR__ . '/../routes/api.php';

// Health check endpoint
if ($uri === '/api/health' && $method === 'GET') {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'ok',
        'service' => 'Sistema POS API',
        'version' => '1.0.0',
        'timestamp' => date('c')
    ]);
    exit();
}

// Buscar ruta que coincida
$routeFound = false;
$params = [];

foreach ($routes as $routePattern => $handler) {
    // Separar método y patrón de la ruta
    [$routeMethod, $routePath] = explode(' ', $routePattern, 2);
    
    if ($routeMethod !== $method) continue;
    
    // Convertir patrón de ruta a regex
    // Ejemplo: /api/products/{id} => /api/products/(\d+)
    $regex = preg_replace('/\{([a-zA-Z_]+)\}/', '([^/]+)', $routePath);
    $regex = '#^' . $regex . '$#';
    
    if (preg_match($regex, $uri, $matches)) {
        $routeFound = true;
        array_shift($matches); // Eliminar el match completo
        $params = $matches;
        
        // Separar controller@method
        [$controllerName, $methodName] = explode('@', $handler);
        
        // Construir nombre completo de la clase
        $controllerClass = "App\\controllers\\{$controllerName}";
        
        // Verificar que la clase existe
        $controllerFile = __DIR__ . "/../controllers/{$controllerName}.php";
        if (!file_exists($controllerFile)) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => "Controlador no encontrado: {$controllerName}"]);
            exit();
        }
        
        require_once $controllerFile;
        
        // Instanciar controlador y llamar método
        $controller = new $controllerClass();
        
        if (!method_exists($controller, $methodName)) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => "Método no encontrado: {$methodName}"]);
            exit();
        }
        
        // Llamar al método con parámetros extraídos de la URL
        call_user_func_array([$controller, $methodName], $params);
        break;
    }
}

if (!$routeFound) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Ruta no encontrada',
        'method' => $method,
        'uri' => $uri
    ]);
}
