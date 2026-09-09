<?php
namespace App\helpers;

/**
 * Calculador de precios con margen de ganancia
 * Soporta margen por porcentaje y por monto fijo
 */
class PriceCalculator
{
    /**
     * Calcular precio de venta basado en precio de compra y margen
     * @param float $purchasePrice Precio de compra
     * @param string $marginType 'percentage' o 'fixed'
     * @param float $marginValue Valor del margen
     * @return float Precio de venta calculado
     */
    public static function calculate(float $purchasePrice, string $marginType, float $marginValue): float
    {
        if ($marginType === 'percentage') {
            // Ejemplo: $100 + 20% = $120
            $salePrice = $purchasePrice * (1 + $marginValue / 100);
        } else {
            // Ejemplo: $100 + $15 = $115
            $salePrice = $purchasePrice + $marginValue;
        }

        return round($salePrice, 2);
    }

    /**
     * Calcular la ganancia en pesos
     */
    public static function getProfit(float $purchasePrice, float $salePrice): float
    {
        return round($salePrice - $purchasePrice, 2);
    }

    /**
     * Calcular el porcentaje de ganancia real
     */
    public static function getProfitPercentage(float $purchasePrice, float $salePrice): float
    {
        if ($purchasePrice <= 0) return 0;
        return round((($salePrice - $purchasePrice) / $purchasePrice) * 100, 2);
    }
}
