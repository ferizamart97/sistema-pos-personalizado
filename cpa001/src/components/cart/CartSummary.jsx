import React, { useState } from 'react';
import TouchButton from '../common/TouchButton';

export default function CartSummary({
  subtotal,
  cartCount,
  onCheckout,
  onClearCart,
  discount = 0,
  onApplyDiscount
}) {
  const [discountInput, setDiscountInput] = useState(discount > 0 ? discount.toString() : '');
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const numDiscount = parseFloat(discountInput) || 0;
  const total = Math.max(0, subtotal - numDiscount);

  const handleDiscountSubmit = (e) => {
    e.preventDefault();
    if (onApplyDiscount) {
      onApplyDiscount(numDiscount);
    }
    setShowDiscountInput(false);
  };

  return (
    <div className="bg-[#f8f9ff] border-t border-[#ccc3d8]/60 p-4 flex flex-col gap-3">
      {/* Discount toggle / input */}
      {showDiscountInput ? (
        <form onSubmit={handleDiscountSubmit} className="flex gap-2">
          <input
            type="number"
            step="0.5"
            min="0"
            max={subtotal}
            placeholder="Descuento en $"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            className="flex-1 min-h-[44px] px-3 bg-white border border-[#ccc3d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#630ed4]"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 bg-[#630ed4] text-white rounded-xl font-medium text-sm active:scale-95"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => setShowDiscountInput(false)}
            className="px-3 bg-neutral-200 text-neutral-700 rounded-xl text-sm"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex justify-between items-center text-xs text-[#7b7487]">
          <button
            type="button"
            onClick={() => setShowDiscountInput(true)}
            className="flex items-center gap-1 text-[#630ed4] hover:underline font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">local_offer</span>
            {numDiscount > 0 ? `Descuento: -$${numDiscount.toFixed(2)}` : 'Agregar descuento'}
          </button>
          {cartCount > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-[#ef4444] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">remove_shopping_cart</span>
              Vaciar ({cartCount})
            </button>
          )}
        </div>
      )}

      {/* Calculations */}
      <div className="space-y-2 text-base text-[#4a4455] border-t border-[#e5eeff] pt-2.5">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Subtotal</span>
          <span className="font-mono font-bold text-lg">${subtotal.toFixed(2)}</span>
        </div>
        {numDiscount > 0 && (
          <div className="flex justify-between items-center text-[#ba1a1a] font-bold">
            <span>Descuento</span>
            <span className="font-mono text-lg">-${numDiscount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Total Display */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-[#630ed4]/30 shadow-sm">
        <span className="text-lg font-black text-[#0b1c30] uppercase">TOTAL</span>
        <span className="text-3xl sm:text-4xl font-black text-[#630ed4] tracking-tight font-mono">
          ${total.toFixed(2)}
        </span>
      </div>

      {/* Checkout Button */}
      <TouchButton
        onClick={() => onCheckout({ subtotal, tax: 0, discount: numDiscount, total })}
        disabled={cartCount === 0}
        variant="success"
        size="lg"
        fullWidth
        icon="payments"
        className="!text-xl !py-4 font-black shadow-lg"
      >
        Cobrar (${total.toFixed(2)})
      </TouchButton>
    </div>
  );
}
