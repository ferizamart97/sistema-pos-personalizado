<?php
namespace App\middleware;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\helpers\Response;

/**
 * Middleware de autenticación JWT
 */
class AuthMiddleware
{
    /**
     * Verificar token JWT del header Authorization
     * @return object Datos del usuario decodificados del token
     */
    public static function authenticate(): object
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            Response::error('Token de autenticación requerido.', 401);
        }

        $token = substr($authHeader, 7);

        try {
            $secret = getenv('JWT_SECRET') ?: 'pos_jwt_secret_key_default';
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            return $decoded;
        } catch (\Firebase\JWT\ExpiredException $e) {
            Response::error('Token expirado. Inicie sesión nuevamente.', 401);
        } catch (\Exception $e) {
            Response::error('Token inválido.', 401);
        }

        // Nunca llega aquí, pero satisface el análisis estático
        exit();
    }

    /**
     * Generar token JWT para un usuario
     */
    public static function generateToken(array $user): string
    {
        $secret = getenv('JWT_SECRET') ?: 'pos_jwt_secret_key_default';
        $issuedAt = time();
        $expiration = $issuedAt + (24 * 60 * 60); // 24 horas

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expiration,
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'name' => $user['name'],
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }
}
