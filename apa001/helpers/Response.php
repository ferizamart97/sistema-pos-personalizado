<?php
namespace App\helpers;

/**
 * Helper para respuestas JSON estandarizadas
 */
class Response
{
    /**
     * Enviar respuesta JSON
     */
    public static function json(mixed $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit();
    }

    /**
     * Respuesta de error
     */
    public static function error(string $message, int $statusCode = 400, array $errors = []): void
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];
        if (!empty($errors)) {
            $response['errors'] = $errors;
        }
        self::json($response, $statusCode);
    }

    /**
     * Respuesta exitosa
     */
    public static function success(string $message, mixed $data = null, int $statusCode = 200): void
    {
        $response = [
            'success' => true,
            'message' => $message,
        ];
        if ($data !== null) {
            $response['data'] = $data;
        }
        self::json($response, $statusCode);
    }

    /**
     * Respuesta paginada
     */
    public static function paginate(array $data, int $total, int $page, int $perPage): void
    {
        self::json([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
            ],
        ]);
    }
}
