<?php
namespace App\middleware;

use App\helpers\Response;

/**
 * Middleware de autorización por roles
 */
class RoleMiddleware
{
    /**
     * Verificar que el usuario tenga uno de los roles permitidos
     * @param array $allowedRoles Roles permitidos (ej: ['admin', 'gerente'])
     * @return object Datos del usuario autenticado
     */
    public static function authorize(array $allowedRoles): object
    {
        $user = AuthMiddleware::authenticate();

        if (!in_array($user->role, $allowedRoles)) {
            Response::error(
                'No tiene permisos para realizar esta acción. Roles requeridos: ' . implode(', ', $allowedRoles),
                403
            );
        }

        return $user;
    }
}
