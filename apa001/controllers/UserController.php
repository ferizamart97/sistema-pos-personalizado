<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

use App\middleware\RoleMiddleware;
use App\helpers\Response;
use App\helpers\Validator;
use Database;

/**
 * Controlador de Usuarios (CRUD completo)
 * Solo accesible por admin y gerente
 */
class UserController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * GET /api/users - Listar usuarios con paginación y búsqueda
     */
    public function index(): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);

        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 15)));
        $search = $_GET['search'] ?? '';
        $role = $_GET['role'] ?? '';
        $offset = ($page - 1) * $perPage;

        $where = [];
        $params = [];

        if ($search) {
            $where[] = "(name ILIKE :search OR email ILIKE :search)";
            $params['search'] = "%{$search}%";
        }
        if ($role) {
            $where[] = "role = :role";
            $params['role'] = $role;
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        // Contar total
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Obtener usuarios
        $stmt = $this->db->prepare(
            "SELECT id, name, email, role, phone, is_active, created_at, updated_at 
             FROM users {$whereClause} 
             ORDER BY created_at DESC 
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        Response::paginate($stmt->fetchAll(), $total, $page, $perPage);
    }

    /**
     * GET /api/users/{id} - Obtener un usuario
     */
    public function show(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);

        $stmt = $this->db->prepare(
            'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Usuario no encontrado.', 404);
        }

        Response::success('Usuario encontrado.', $user);
    }

    /**
     * POST /api/users - Crear usuario
     */
    public function store(): void
    {
        $authUser = RoleMiddleware::authorize(['admin']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $errors = Validator::validate($data, [
            'name' => 'required|min:2|max:100',
            'email' => 'required|email',
            'password' => 'required|min:6',
            'role' => 'required|in:admin,gerente,vendedor',
        ]);

        if (!empty($errors)) {
            Response::error('Datos inválidos.', 422, $errors);
        }

        // Verificar email único
        $checkStmt = $this->db->prepare('SELECT id FROM users WHERE email = :email');
        $checkStmt->execute(['email' => $data['email']]);
        if ($checkStmt->fetch()) {
            Response::error('El email ya está registrado.', 409);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password, role, phone) 
             VALUES (:name, :email, :password, :role, :phone) RETURNING id'
        );
        $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
        ]);

        $newId = $stmt->fetchColumn();
        $this->logAudit($authUser->user_id, 'create', 'users', $newId, null, $data);

        Response::success('Usuario creado exitosamente.', ['id' => $newId], 201);
    }

    /**
     * PUT /api/users/{id} - Actualizar usuario
     */
    public function update(string $id): void
    {
        $authUser = RoleMiddleware::authorize(['admin']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        // Obtener datos actuales para auditoría
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $currentUser = $stmt->fetch();

        if (!$currentUser) {
            Response::error('Usuario no encontrado.', 404);
        }

        $fields = [];
        $params = ['id' => $id];

        if (isset($data['name'])) { $fields[] = 'name = :name'; $params['name'] = $data['name']; }
        if (isset($data['email'])) { $fields[] = 'email = :email'; $params['email'] = $data['email']; }
        if (isset($data['role'])) { $fields[] = 'role = :role'; $params['role'] = $data['role']; }
        if (isset($data['phone'])) { $fields[] = 'phone = :phone'; $params['phone'] = $data['phone']; }
        if (!empty($data['password'])) {
            $fields[] = 'password = :password';
            $params['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (empty($fields)) {
            Response::error('No se proporcionaron datos para actualizar.', 400);
        }

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $this->db->prepare($sql)->execute($params);

        $this->logAudit($authUser->user_id, 'update', 'users', (int)$id, $currentUser, $data);

        Response::success('Usuario actualizado exitosamente.');
    }

    /**
     * PATCH /api/users/{id}/toggle - Deshabilitar/habilitar usuario (soft delete)
     */
    public function toggle(string $id): void
    {
        $authUser = RoleMiddleware::authorize(['admin']);

        $stmt = $this->db->prepare('UPDATE users SET is_active = NOT is_active WHERE id = :id RETURNING is_active');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();

        if (!$result) {
            Response::error('Usuario no encontrado.', 404);
        }

        $status = $result['is_active'] ? 'habilitado' : 'deshabilitado';
        $this->logAudit($authUser->user_id, 'toggle', 'users', (int)$id, null, ['is_active' => $result['is_active']]);

        Response::success("Usuario {$status} exitosamente.", ['is_active' => $result['is_active']]);
    }

    /**
     * DELETE /api/users/{id} - Eliminar usuario permanentemente (hard delete)
     */
    public function destroy(string $id): void
    {
        $authUser = RoleMiddleware::authorize(['admin']);

        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Usuario no encontrado.', 404);
        }

        // No permitir auto-eliminación
        if ((int)$id === $authUser->user_id) {
            Response::error('No puede eliminarse a sí mismo.', 403);
        }

        $this->logAudit($authUser->user_id, 'hard_delete', 'users', (int)$id, $user, null);
        $this->db->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $id]);

        Response::success('Usuario eliminado permanentemente.');
    }

    /**
     * Registrar acción en bitácora de auditoría
     */
    private function logAudit(int $userId, string $action, string $entity, int $entityId, ?array $oldValues, ?array $newValues): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO audit_log (user_id, action, entity, entity_id, old_values, new_values, ip_address) 
             VALUES (:user_id, :action, :entity, :entity_id, :old_values, :new_values, :ip)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => $newValues ? json_encode($newValues) : null,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
        ]);
    }
}
