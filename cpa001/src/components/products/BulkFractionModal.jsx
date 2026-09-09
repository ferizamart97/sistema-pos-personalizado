import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axiosConfig';
import Modal from '../common/Modal';
import TouchButton from '../common/TouchButton';

export default function BulkFractionModal({ isOpen, onClose, product, onAddBulk, onAddFraction, onAddNormal }) {
  const [fractions, setFractions] = useState([]);
  const [loadingFractions, setLoadingFractions] = useState(false);
  
  const isPieceUnit = !product || product.unit === 'pza' || product.bulk_unit === 'pza';
  const [customQty, setCustomQty] = useState(isPieceUnit ? '25' : '0.250');

  useEffect(() => {
    if (product && isOpen) {
      setCustomQty(product.unit === 'pza' || product.bulk_unit === 'pza' ? '25' : '0.250');
      fetchFractions();
    }
  }, [product, isOpen]);

  const fetchFractions = async () => {
    try {
      setLoadingFractions(true);
      const res = await api.get(`/products/${product.id}/fractions`);
      setFractions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFractions(false);
    }
  };

  if (!product) return null;

  const unitName = product.bulk_unit || product.unit || 'pza';
  const basePricePerUnit = parseFloat(product.bulk_price && parseFloat(product.bulk_price) > 0 ? product.bulk_price : product.sale_price);
  const currentQtyNum = parseFloat(customQty) || 0;
  const calculatedCustomPrice = (basePricePerUnit * currentQtyNum).toFixed(2);

  const handleKeypad = (val) => {
    if (val === 'C') {
      setCustomQty('0');
    } else if (val === 'backspace') {
      setCustomQty((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (val === '.') {
      if (!isPieceUnit && !customQty.includes('.')) setCustomQty((prev) => prev + '.');
    } else {
      setCustomQty((prev) => (prev === '0' ? String(val) : prev + val));
    }
  };

  const handleApplyCustom = () => {
    if (currentQtyNum <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (isPieceUnit && onAddNormal) {
      onAddNormal(product, currentQtyNum);
    } else {
      onAddBulk(product, currentQtyNum, basePricePerUnit);
    }
    toast.success(`+${currentQtyNum} ${unitName} de ${product.name}`);
    onClose();
  };

  const handleSelectFraction = (frac) => {
    onAddFraction(product, frac);
    toast.success(`+${frac.name} de ${product.name}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPieceUnit ? `Presentaciones & Paquetes: ${product.name}` : `Venta a Granel / Fracción: ${product.name}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Info Header */}
        <div className="flex items-center justify-between p-4 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/40">
          <div>
            <span className="text-xs sm:text-sm text-[#7b7487] font-bold uppercase">
              {isPieceUnit ? 'Precio Unitario Base' : `Precio por ${unitName}`}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#630ed4] font-mono">${basePricePerUnit.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <span className="text-xs sm:text-sm text-[#7b7487] font-bold uppercase">Stock Total Disponible</span>
            <div className="text-base sm:text-lg font-black text-[#0b1c30] font-mono">
              {product.total_stock !== undefined ? product.total_stock : product.stock || 0} {unitName}
            </div>
          </div>
        </div>

        {/* Quick Fractions / Piece packages */}
        {fractions.length > 0 && (
          <div className="space-y-2.5">
            <label className="text-xs sm:text-sm font-black text-[#0b1c30] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#630ed4]">inventory</span>
              <span>{isPieceUnit ? 'Paquetes y Presentaciones Preconfiguradas' : 'Presentaciones Rápidas (Fracciones)'}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {fractions.map((frac) => (
                <button
                  key={frac.id}
                  type="button"
                  onClick={() => handleSelectFraction(frac)}
                  className="min-h-[58px] p-3 bg-white border-2 border-[#630ed4]/30 hover:border-[#630ed4] hover:bg-[#eff4ff] text-[#0b1c30] rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-xs"
                >
                  <span className="font-bold text-xs sm:text-sm text-center leading-tight">{frac.name}</span>
                  <span className="text-base sm:text-lg font-black text-[#630ed4] font-mono mt-0.5">
                    ${parseFloat(frac.price).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Quantity Keypad */}
        <div className="space-y-2.5 pt-3 border-t border-[#e5eeff]">
          <label className="text-xs sm:text-sm font-black text-[#0b1c30] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#630ed4]">dialpad</span>
            <span>{isPieceUnit ? 'Cantidad Personalizada de Piezas' : `Pesaje Personalizado (${unitName})`}</span>
          </label>

          <div className="flex items-center justify-between p-4 bg-[#f8f9ff] border-2 border-[#630ed4] rounded-2xl">
            <div>
              <span className="text-xs sm:text-sm font-bold text-[#7b7487] uppercase block">
                {isPieceUnit ? 'Piezas a cobrar:' : 'Peso a cobrar:'}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#0b1c30]">
                {customQty} {unitName}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs sm:text-sm font-bold text-[#7b7487] uppercase block">Total a cobrar:</span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#16a34a]">${calculatedCustomPrice}</div>
            </div>
          </div>

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', isPieceUnit ? '00' : '.'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === '00') {
                    setCustomQty((prev) => (prev === '0' ? '0' : prev + '00'));
                  } else {
                    handleKeypad(key);
                  }
                }}
                className={`min-h-[50px] rounded-2xl font-mono text-xl font-black flex items-center justify-center active:scale-95 transition-all shadow-xs ${
                  key === 'C'
                    ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30'
                    : 'bg-white text-[#0b1c30] border border-[#ccc3d8]/60 hover:bg-[#eff4ff]'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <TouchButton
              onClick={handleApplyCustom}
              variant="primary"
              size="lg"
              fullWidth
              icon="add_shopping_cart"
              className="min-h-[52px] text-sm sm:text-base font-black"
            >
              Agregar {customQty} {unitName} al Carrito
            </TouchButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
