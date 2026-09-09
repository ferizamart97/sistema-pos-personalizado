import React from 'react';

export default function PriceMarginInput({
  purchasePrice = 0,
  marginType = 'percentage',
  marginValue = 0,
  onChange,
  onChangePurchasePrice,
  onChangeMarginType,
  onChangeMarginValue
}) {
  const pPrice = parseFloat(purchasePrice) || 0;
  const mVal = parseFloat(marginValue) || 0;

  const handlePriceChange = (val) => {
    if (onChangePurchasePrice) onChangePurchasePrice(val);
    if (onChange) onChange({ purchase_price: val, margin_type: marginType, margin_value: marginValue });
  };

  const handleMarginTypeChange = (type) => {
    if (onChangeMarginType) onChangeMarginType(type);
    if (onChange) onChange({ purchase_price: purchasePrice, margin_type: type, margin_value: marginValue });
  };

  const handleMarginValueChange = (val) => {
    if (onChangeMarginValue) onChangeMarginValue(val);
    if (onChange) onChange({ purchase_price: purchasePrice, margin_type: marginType, margin_value: val });
  };

  // Calculate Sale Price and Profit
  let calculatedSalePrice = 0;
  let calculatedProfit = 0;

  if (marginType === 'percentage') {
    calculatedSalePrice = pPrice * (1 + mVal / 100);
    calculatedProfit = calculatedSalePrice - pPrice;
  } else {
    calculatedSalePrice = pPrice + mVal;
    calculatedProfit = mVal;
  }

  return (
    <div className="space-y-3 p-4 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
          Configuración de Precio y Ganancia
        </span>
        <span className="text-xs font-semibold text-[#630ed4] bg-[#630ed4]/10 px-2.5 py-0.5 rounded-full">
          Cálculo Automático
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Purchase Price Input */}
        <div>
          <label className="block text-xs font-semibold text-[#4a4455] mb-1">
            Precio de Compra ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-[#7b7487] font-bold text-sm">$</span>
            <input
              type="number"
              step="0.5"
              min="0"
              required
              value={purchasePrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.00"
              className="w-full min-h-[44px] pl-7 pr-3 bg-white border border-[#ccc3d8] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            />
          </div>
        </div>

        {/* Margin Type Selector (% or $) */}
        <div>
          <label className="block text-xs font-semibold text-[#4a4455] mb-1">
            Tipo de Margen
          </label>
          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-[#ccc3d8]">
            <button
              type="button"
              onClick={() => handleMarginTypeChange('percentage')}
              className={`min-h-[34px] rounded-lg text-xs font-bold transition-all ${
                marginType === 'percentage'
                  ? 'bg-[#630ed4] text-white shadow-xs'
                  : 'text-[#4a4455] hover:bg-[#e5eeff]'
              }`}
            >
              Porcentaje (%)
            </button>
            <button
              type="button"
              onClick={() => handleMarginTypeChange('fixed')}
              className={`min-h-[34px] rounded-lg text-xs font-bold transition-all ${
                marginType === 'fixed'
                  ? 'bg-[#630ed4] text-white shadow-xs'
                  : 'text-[#4a4455] hover:bg-[#e5eeff]'
              }`}
            >
              Monto Fijo ($)
            </button>
          </div>
        </div>

        {/* Margin Value Input */}
        <div>
          <label className="block text-xs font-semibold text-[#4a4455] mb-1">
            {marginType === 'percentage' ? 'Margen Deseado (%)' : 'Ganancia Fija ($)'}
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0"
              required
              value={marginValue}
              onChange={(e) => handleMarginValueChange(e.target.value)}
              placeholder={marginType === 'percentage' ? 'Ej: 20' : 'Ej: 15'}
              className="w-full min-h-[44px] pl-3 pr-8 bg-white border border-[#ccc3d8] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            />
            <span className="absolute right-3 top-2.5 text-[#7b7487] font-bold text-sm">
              {marginType === 'percentage' ? '%' : '$'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Calculation Summary Display */}
      <div className="pt-2 border-t border-[#ccc3d8]/40 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-white rounded-xl border border-[#e5eeff]">
          <div className="text-[10px] text-[#7b7487] uppercase font-bold">Costo Base</div>
          <div className="text-sm font-bold text-[#0b1c30] font-mono">${pPrice.toFixed(2)}</div>
        </div>

        <div className="p-2 bg-white rounded-xl border border-[#e5eeff]">
          <div className="text-[10px] text-[#22c55e] uppercase font-bold">Ganancia Estimada</div>
          <div className="text-sm font-bold text-[#22c55e] font-mono">
            +${calculatedProfit.toFixed(2)} {marginType === 'percentage' ? `(${mVal}%)` : ''}
          </div>
        </div>

        <div className="p-2 bg-[#630ed4] text-white rounded-xl shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[10px] text-[#ede0ff] uppercase font-bold">Precio de Venta</div>
          <div className="text-lg font-black font-mono tracking-tight">${calculatedSalePrice.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
