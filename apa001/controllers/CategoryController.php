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
 * Controlador de Categorías (Dulcería, Materias Primas, Regalos)
 */
class CategoryController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/categories */
    public function index(): void
    {
        AuthMiddleware::authenticate();

        $type = $_GET['type'] ?? '';
        $params = [];
        $where = '';

        if ($type) {
            $where = 'WHERE c.type = :type';
            $params['type'] = $type;
        }

        $stmt = $this->db->prepare(
            "SELECT c.*, COUNT(s.id) as subcategory_count 
             FROM categories c 
             LEFT JOIN subcategories s ON s.category_id = c.id AND s.is_active = true
             {$where}
             GROUP BY c.id 
             ORDER BY c.name ASC"
        );
        $stmt->execute($params);

        Response::success('Categorías obtenidas.', $stmt->fetchAll());
    }

    /** GET /api/categories/{id} */
    public function show(string $id): void
    {
        AuthMiddleware::authenticate();

        $stmt = $this->db->prepare(
            'SELECT c.*, 
                    (SELECT COUNT(*) FROM subcategories WHERE category_id = c.id AND is_active = true) as subcategory_count
             FROM categories c WHERE c.id = :id'
        );
        $stmt->execute(['id' => $id]);
        $category = $stmt->fetch();

        if (!$category) Response::error('Categoría no encontrada.', 404);

        // Obtener subcategorías
        $subStmt = $this->db->prepare('SELECT * FROM subcategories WHERE category_id = :id ORDER BY name');
        $subStmt->execute(['id' => $id]);
        $category['subcategories'] = $subStmt->fetchAll();

        Response::success('Categoría encontrada.', $category);
    }

    /** POST /api/categories */
    public function store(): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $errors = Validator::validate($data, [
            'name' => 'required|min:2|max:100',
            'type' => 'required|in:dulceria,materias_primas,regalos',
        ]);
        if (!empty($errors)) Response::error('Datos inválidos.', 422, $errors);

        $slug = $this->generateSlug($data['name']);

        $stmt = $this->db->prepare(
            'INSERT INTO categories (name, slug, type, description, image_url) 
             VALUES (:name, :slug, :type, :description, :image_url) RETURNING id'
        );
        $stmt->execute([
            'name' => $data['name'],
            'slug' => $slug,
            'type' => $data['type'],
            'description' => $data['description'] ?? null,
            'image_url' => $data['image_url'] ?? null,
        ]);

        Response::success('Categoría creada.', ['id' => $stmt->fetchColumn()], 201);
    }

    /** PUT /api/categories/{id} */
    public function update(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $fields = [];
        $params = ['id' => $id];

        if (isset($data['name'])) {
            $fields[] = 'name = :name';
            $params['name'] = $data['name'];
            $fields[] = 'slug = :slug';
            $params['slug'] = $this->generateSlug($data['name']);
        }
        if (isset($data['description'])) { $fields[] = 'description = :desc'; $params['desc'] = $data['description']; }
        if (isset($data['image_url'])) { $fields[] = 'image_url = :img'; $params['img'] = $data['image_url']; }

        if (empty($fields)) Response::error('No se proporcionaron datos.', 400);

        $sql = 'UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $this->db->prepare($sql)->execute($params);

        Response::success('Categoría actualizada.');
    }

    /** PATCH /api/categories/{id}/toggle */
    public function toggle(string $id): void
    {
        RoleMiddleware::authorize(['admin', 'gerente']);
        $stmt = $this->db->prepare('UPDATE categories SET is_active = NOT is_active WHERE id = :id RETURNING is_active');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        if (!$result) Response::error('Categoría no encontrada.', 404);
        Response::success('Estado actualizado.', ['is_active' => $result['is_active']]);
    }

    /** DELETE /api/categories/{id} */
    public function destroy(string $id): void
    {
        RoleMiddleware::authorize(['admin']);
        try {
            // Intentar eliminación física
            $this->db->prepare('DELETE FROM categories WHERE id = :id')->execute(['id' => $id]);
            Response::success('Categoría eliminada permanentemente.');
        } catch (\PDOException $e) {
            // Si hay registros vinculados (subcategorías o productos), deshabilitar lógicamente
            $stmt = $this->db->prepare('UPDATE categories SET is_active = false WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $this->db->prepare('UPDATE subcategories SET is_active = false WHERE category_id = :id')->execute(['id' => $id]);
            Response::success('Categoría y subcategorías vinculadas deshabilitadas con éxito.');
        }
    }

    private function generateSlug(string $name): string
    {
        $slug = mb_strtolower($name);
        $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
        $slug = preg_replace('/[\s-]+/', '-', $slug);
        return trim($slug, '-');
    }
}
