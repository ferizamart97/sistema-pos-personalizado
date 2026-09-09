<?php
/**
 * Script de población / recarga de datos masivos para Sistema POS
 * Ejecuta 05_massive_test_data.sql y muestra el conteo verificado de todas las tablas.
 */

require_once __DIR__ . '/../config/database.php';

echo "=========================================================\n";
echo "📦 Sistema POS - Ejecutor de Datos Masivos de Prueba\n";
echo "=========================================================\n\n";

try {
    $db = Database::getConnection();
    echo "✅ Conexión exitosa a la base de datos PostgreSQL.\n";

    $sqlFile = __DIR__ . '/migrations/05_massive_test_data.sql';
    if (!file_exists($sqlFile)) {
        throw new RuntimeException("Archivo SQL no encontrado: {$sqlFile}");
    }

    echo "⏳ Leyendo y ejecutando 05_massive_test_data.sql (" . number_format(filesize($sqlFile) / 1024, 2) . " KB)...\n";
    $sqlContent = file_get_contents($sqlFile);

    $db->exec($sqlContent);
    echo "🎉 Script SQL ejecutado correctamente.\n\n";

    echo "📊 Conteo de Registros por Tabla:\n";
    echo "---------------------------------------------------------\n";
    $tables = [
        'users' => 'Usuarios del Sistema',
        'categories' => 'Categorías',
        'subcategories' => 'Subcategorías',
        'products' => 'Productos Totales',
        'product_batches' => 'Lotes de Inventario (Batches)',
        'product_fraction_prices' => 'Precios Fraccionados',
        'product_wholesale_tiers' => 'Escalas de Mayoreo',
        'services' => 'Catálogo de Servicios',
        'packages' => 'Paquetes / Combos Piñateros',
        'package_items' => 'Componentes de Paquetes',
        'custom_orders' => 'Pedidos Especiales (2023-2026)',
        'layaways' => 'Apartados (2023-2026)',
        'layaway_items' => 'Productos en Apartados',
        'layaway_payments' => 'Historial de Abonos a Apartados',
        'sales' => 'Ventas Históricas (2023-2026)',
        'sale_details' => 'Detalles / Líneas de Venta',
        'tickets' => 'Tickets de Venta Emitidos',
        'settings' => 'Parámetros de Configuración',
        'audit_log' => 'Bitácora de Auditoría'
    ];

    foreach ($tables as $table => $label) {
        $count = $db->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
        printf(" • %-35s : %6d registros\n", $label, (int)$count);
    }

    echo "---------------------------------------------------------\n";
    echo "🧁 Conteo de Productos por Categoría Principal:\n";
    $catStmt = $db->query("
        SELECT c.name, COUNT(p.id) as total_products
        FROM categories c
        JOIN subcategories s ON s.category_id = c.id
        JOIN products p ON p.subcategory_id = s.id
        GROUP BY c.id, c.name
        ORDER BY c.id
    ");
    while ($row = $catStmt->fetch()) {
        printf(" • %-35s : %6d productos\n", $row['name'], (int)$row['total_products']);
    }

    echo "\n🚦 Distribución de Lotes en Semáforo de Caducidad:\n";
    $semStmt = $db->query("
        SELECT semaphore_label, semaphore, COUNT(*) as total
        FROM v_expiration_semaphore
        GROUP BY semaphore_label, semaphore
        ORDER BY 
            CASE semaphore 
                WHEN 'red' THEN 1 
                WHEN 'orange' THEN 2 
                WHEN 'yellow' THEN 3 
                ELSE 4 
            END
    ");
    while ($row = $semStmt->fetch()) {
        $emoji = match($row['semaphore']) {
            'red' => '🔴',
            'orange' => '🟠',
            'yellow' => '🟡',
            default => '🟢'
        };
        printf(" %s %-33s : %6d lotes activos\n", $emoji, $row['semaphore_label'], (int)$row['total']);
    }

    echo "\n✅ Proceso completado exitosamente.\n";

} catch (Exception $e) {
    echo "❌ Error al poblar datos: " . $e->getMessage() . "\n";
    exit(1);
}
