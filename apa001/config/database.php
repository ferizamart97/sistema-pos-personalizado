<?php
/**
 * Configuración de conexión a PostgreSQL
 * Patrón Singleton para reutilizar la conexión PDO
 */

class Database
{
    private static ?PDO $instance = null;

    /**
     * Obtener la instancia de conexión PDO
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: 'db';
            $port = getenv('DB_PORT') ?: '5432';
            $dbname = getenv('DB_NAME') ?: getenv('DB_DATABASE') ?: 'pos_db';
            $user = getenv('DB_USER') ?: getenv('DB_USERNAME') ?: 'pos_user';
            $password = getenv('DB_PASSWORD') ?: '';

            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";

            try {
                self::$instance = new PDO($dsn, $user, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Error de conexión a la base de datos',
                    'message' => $e->getMessage()
                ]);
                exit();
            }
        }

        return self::$instance;
    }
}
