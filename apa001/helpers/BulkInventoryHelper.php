<?php
namespace App\helpers;

/**
 * Helper para gestión de inventario a granel y conversión de bolsas selladas
 */
class BulkInventoryHelper
{
    /**
     * Abrir una o más bolsas selladas de un producto y transferir su contenido a bulk_stock
     * Descuenta del lote más próximo a caducar usando FIFO
     */
    public static function openPackageForBulk(\PDO $db, int $productId, int $packagesCount = 1, ?int $userId = null): array
    {
        // 1. Obtener producto
        $prodStmt = $db->prepare('SELECT * FROM products WHERE id = :id AND is_active = true');
        $prodStmt->execute(['id' => $productId]);
        $product = $prodStmt->fetch();

        if (!$product) {
            throw new \RuntimeException('Producto no encontrado o inactivo.');
        }

        if (!filter_var($product['is_bulk_enabled'], FILTER_VALIDATE_BOOLEAN)) {
            // Si no estaba marcado, auto-habilitar la modalidad de granel
            $enableStmt = $db->prepare('UPDATE products SET is_bulk_enabled = true WHERE id = :id');
            $enableStmt->execute(['id' => $productId]);
            $product['is_bulk_enabled'] = true;
        }

        $packageContent = (float)($product['package_content'] ?: 1.000);
        $contentToAdd = $packagesCount * $packageContent;

        // 2. Buscar lotes disponibles ordenados por FIFO (caducidad más cercana)
        $batchStmt = $db->prepare('
            SELECT * FROM product_batches 
            WHERE product_id = :id AND is_active = true AND (quantity - quantity_sold) > 0
            ORDER BY expiration_date ASC
        ');
        $batchStmt->execute(['id' => $productId]);
        $batches = $batchStmt->fetchAll();

        $totalAvailableBags = 0;
        foreach ($batches as $b) {
            $totalAvailableBags += ($b['quantity'] - $b['quantity_sold']);
        }

        if ($totalAvailableBags < $packagesCount) {
            throw new \RuntimeException("Stock de bolsas insuficientes. Disponibles: {$totalAvailableBags}, Solicitadas para abrir: {$packagesCount}");
        }

        // 3. Descontar las bolsas por FIFO
        $remainingToDeduct = $packagesCount;
        $affectedBatches = [];

        foreach ($batches as $batch) {
            if ($remainingToDeduct <= 0) break;

            $batchAvail = $batch['quantity'] - $batch['quantity_sold'];
            $deductFromThis = min($remainingToDeduct, $batchAvail);

            $updateBatch = $db->prepare('UPDATE product_batches SET quantity_sold = quantity_sold + :qty WHERE id = :id');
            $updateBatch->execute(['qty' => $deductFromThis, 'id' => $batch['id']]);

            $affectedBatches[] = [
                'batch_id' => $batch['id'],
                'batch_number' => $batch['batch_number'],
                'deducted_bags' => $deductFromThis,
                'expiration_date' => $batch['expiration_date']
            ];

            $remainingToDeduct -= $deductFromThis;
        }

        // 4. Sumar el contenido al stock a granel (bulk_stock)
        $updateProd = $db->prepare('UPDATE products SET bulk_stock = bulk_stock + :content WHERE id = :id RETURNING bulk_stock');
        $updateProd->execute(['content' => $contentToAdd, 'id' => $productId]);
        $newBulkStock = (float)$updateProd->fetchColumn();

        // 5. Registrar en audit_log
        if ($userId) {
            $logStmt = $db->prepare('
                INSERT INTO audit_log (user_id, action, entity, entity_id, new_values)
                VALUES (:user_id, :action, :entity, :rec_id, :details)
            ');
            $logStmt->execute([
                'user_id' => $userId,
                'action' => 'open_bulk_package',
                'entity' => 'products',
                'rec_id' => $productId,
                'details' => json_encode([
                    'packages_opened' => $packagesCount,
                    'content_added' => $contentToAdd,
                    'new_bulk_stock' => $newBulkStock,
                    'affected_batches' => $affectedBatches
                ])
            ]);
        }

        return [
            'product_id' => $productId,
            'packages_opened' => $packagesCount,
            'content_added' => $contentToAdd,
            'new_bulk_stock' => $newBulkStock,
            'unit' => $product['bulk_unit'],
            'affected_batches' => $affectedBatches
        ];
    }

    /**
     * Asegurar que haya suficiente stock a granel disponible.
     * Si no alcanza, abre automáticamente las bolsas necesarias usando FIFO.
     */
    public static function ensureBulkStockAvailable(\PDO $db, int $productId, float $requiredQuantity, ?int $userId = null): array
    {
        $prodStmt = $db->prepare('SELECT is_bulk_enabled, bulk_stock, package_content FROM products WHERE id = :id');
        $prodStmt->execute(['id' => $productId]);
        $prod = $prodStmt->fetch();

        if (!$prod || !$prod['is_bulk_enabled']) {
            throw new \RuntimeException('El producto no permite venta a granel.');
        }

        $currentBulkStock = (float)($prod['bulk_stock'] ?: 0);
        $packageContent = (float)($prod['package_content'] ?: 1.000);

        if ($currentBulkStock >= $requiredQuantity) {
            return ['packages_opened' => 0, 'current_bulk_stock' => $currentBulkStock];
        }

        // Calcular cuántas bolsas se deben abrir
        $needed = $requiredQuantity - $currentBulkStock;
        $bagsToOpen = (int)ceil($needed / $packageContent);

        $result = self::openPackageForBulk($db, $productId, $bagsToOpen, $userId);
        return $result;
    }
}
