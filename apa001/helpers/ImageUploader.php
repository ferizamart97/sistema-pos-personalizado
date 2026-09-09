<?php
namespace App\helpers;

/**
 * Subida y procesamiento de imágenes de productos
 */
class ImageUploader
{
    private static array $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    private static int $maxSize = 5 * 1024 * 1024; // 5MB

    /**
     * Subir imagen al servidor
     * @return string Ruta relativa de la imagen guardada
     */
    public static function upload(array $file, string $directory = 'products'): string
    {
        // Validar que se subió correctamente
        if (!isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('Error al subir la imagen.');
        }

        // Validar tipo de archivo
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, self::$allowedTypes)) {
            throw new \RuntimeException('Tipo de archivo no permitido. Use JPG, PNG o WebP.');
        }

        // Validar tamaño
        if ($file['size'] > self::$maxSize) {
            throw new \RuntimeException('La imagen excede el tamaño máximo de 5MB.');
        }

        // Generar nombre único
        $extension = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
        $filename = uniqid('prod_', true) . '.' . $extension;

        // Crear directorio público si no existe
        $uploadDir = __DIR__ . '/../public/uploads/' . $directory;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Mover archivo
        $destination = $uploadDir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \RuntimeException('Error al guardar la imagen.');
        }

        return "/uploads/{$directory}/{$filename}";
    }

    /**
     * Eliminar imagen del servidor
     */
    public static function delete(string $path): bool
    {
        $fullPath = __DIR__ . '/..' . $path;
        if (file_exists($fullPath)) {
            return unlink($fullPath);
        }
        return false;
    }
}
