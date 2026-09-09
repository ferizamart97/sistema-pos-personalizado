<?php
namespace App\controllers;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

use App\middleware\AuthMiddleware;
use App\middleware\RoleMiddleware;
use App\helpers\Response;
use App\helpers\Validator;
use Database;

/**
 * Controlador de Subcategorías
 */
class SubcategoryController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/subcategories */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare(
            "SELECT s.*, c.name as category_name, c.type as category_type,
                    (SELECT COUNT(*) FROM products WHERE subcategory_id = s.id) as product_count
             FROM subcategories s
             JOIN categories c ON c.id = s.category_id
             ORDER BY c.name, s.name"
        );
        $stmt->execute();
        Response::success('Subcategorías obtenidas.', $stmt->fetchAll());
    }

    /** GET /api/categories/{categoryId}/subcategories */
    public function byCategory(string $categoryId): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM products WHERE subcategory_id = s.id AND is_active = true) as product_count
             FROM subcategories s 
             WHERE s.category_id = :category_id 
             ORDER BY s.name"
        );
        $stmt->execute(['category_id' => $categoryId]);
        Response::success('Subcategorías obtenidas.', $stmt->fetchAll());
    }

    /** GET /api/subcategories/{id} */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();
        $stmt = $this->db->prepare(
            'SELECT s.*, c.name as category_name, c.type as category_type 
             FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE s.id = :id'
        );
        $stmt->execute(['id' => $id]);
        $sub = $stmt->fetch();
        if (!$sub) Response::error('Subcategoría no encontrada.', 404);
        Response::success('Subcategoría encontrada.', $sub);
    }

    /** POST /api/subcategories */
    public function store(): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $errors = Validator::validate($data, [
            'name' => 'required|min:2|max:100',
            'category_id' => 'required|integer',
        ]);
        if (!empty($errors)) Response::error('Datos inválidos.', 422, $errors);

        $slug = mb_strtolower(preg_replace('/[\s]+/', '-', preg_replace('/[^a-zA-Z0-9\s]/', '', $data['name'])));

        $stmt = $this->db->prepare(
            'INSERT INTO subcategories (category_id, name, slug, description, image_url)
             VALUES (:cat_id, :name, :slug, :desc, :img) RETURNING id'
        );
        $stmt->execute([
            'cat_id' => $data['category_id'],
            'name' => $data['name'],
            'slug' => $slug . '-' . time(),
            'desc' => $data['description'] ?? null,
            'img' => $data['image_url'] ?? null,
        ]);

        Response::success('Subcategoría creada.', ['id' => $stmt->fetchColumn()], 201);
    }

    /** PUT /api/subcategories/{id} */
    public function update(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $fields = [];
        $params = ['id' => $id];
        if (isset($data['name'])) { $fields[] = 'name = :name'; $params['name'] = $data['name']; }
        if (isset($data['description'])) { $fields[] = 'description = :desc'; $params['desc'] = $data['description']; }
        if (isset($data['image_url'])) { $fields[] = 'image_url = :img'; $params['img'] = $data['image_url']; }
        if (isset($data['category_id'])) { $fields[] = 'category_id = :cat_id'; $params['cat_id'] = $data['category_id']; }

        if (empty($fields)) Response::error('No se proporcionaron datos.', 400);

        $this->db->prepare('UPDATE subcategories SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
        Response::success('Subcategoría actualizada.');
    }

    /** PATCH /api/subcategories/{id}/toggle */
    public function toggle(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $stmt = $this->db->prepare('UPDATE subcategories SET is_active = NOT is_active WHERE id = :id RETURNING is_active');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        if (!$result) Response::error('Subcategoría no encontrada.', 404);
        Response::success('Estado actualizado.', ['is_active' => $result['is_active']]);
    }

    /** DELETE /api/subcategories/{id} */
    public function destroy(string $id): void
    {
        RoleMiddleware::authorize(['admin']);
        try {
            $this->db->prepare('DELETE FROM subcategories WHERE id = :id')->execute(['id' => $id]);
            Response::success('Subcategoría eliminada permanentemente.');
        } catch (\PDOException $e) {
            $this->db->prepare('UPDATE subcategories SET is_active = false WHERE id = :id')->execute(['id' => $id]);
            Response::success('Subcategoría deshabilitada con éxito (contiene productos asociados).');
        }
    }
}
