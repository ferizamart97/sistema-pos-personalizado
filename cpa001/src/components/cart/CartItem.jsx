import React from 'react';

export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const itemKey = item.key || `${item.item_type || 'producto'}-${item.product_id || item.package_id || item.service_id}-${item.fraction_id || 'base'}`;
  const isBulk = item.item_type === 'granel';
  const unitPrice = parseFloat(item.unit_price || item.sale_price || 0);
  const subtotal = (unitPrice * item.quantity).toFixed(2);

  const handleDecrement = () => {
    if (isBulk) {
      if (item.quantity > 0.1) {
        onUpdateQuantity(itemKey, Math.max(0.05, item.quantity - 0.1));
      } else {
        onRemove(itemKey);
      }
    } else {
      if (item.quantity > 1) {
        onUpdateQuantity(itemKey, item.quantity - 1);
      } else {
        onRemove(itemKey);
      }
    }
  };

  const handleIncrement = () => {
    if (isBulk) {
      onUpdateQuantity(itemKey, item.quantity + 0.1);
    } else {
      onUpdateQuantity(itemKey, item.quantity + 1);
    }
  };

  // Badge icon by item type
  const getTypeBadge = () => {
    switch (item.item_type) {
      case 'paquete':
        return <span className="text-xs bg-[#ffeedd] text-[#ea580c] font-bold px-2 py-0.5 rounded-md">Paquete</span>;
      case 'servicio':
        return <span className="text-xs bg-[#eff4ff] text-[#0284c7] font-bold px-2 py-0.5 rounded-md">Servicio</span>;
      case 'granel':
        return <span className="text-xs bg-[#fef9c3] text-[#854d0e] font-bold px-2 py-0.5 rounded-md">Granel</span>;
      case 'fraccion':
        return <span className="text-xs bg-[#eff4ff] text-[#005479] font-bold px-2 py-0.5 rounded-md">Fracción</span>;
      default:
        return item.is_wholesale_applied ? (
          <span className="text-xs bg-[#dcfce7] text-[#15803d] font-bold px-2 py-0.5 rounded-md font-mono">
            🏷️ Mayoreo
          </span>
        ) : null;
    }
  };

  return (
    <div className="p-3.5 bg-white rounded-2xl border border-[#e5eeff] shadow-xs hover:border-[#ccc3d8] transition-all space-y-2.5 select-none">
      {/* Top row: Icon + Name + Badge + Remove button */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center overflow-hidden shrink-0 text-[#630ed4] border border-[#ccc3d8]/30">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[22px]">
                {item.item_type === 'paquete' ? 'celebration' : item.item_type === 'servicio' ? 'design_services' : 'shopping_bag'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-sm sm:text-base font-extrabold text-[#0b1c30] truncate" title={item.name}>
              {item.name}
            </h5>
            {getTypeBadge() && (
              <div className="mt-0.5">
                {getTypeBadge()}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(itemKey)}
          className="w-8 h-8 rounded-xl text-[#7b7487] hover:text-[#ba1a1a] hover:bg-[#ffdad6] flex items-center justify-center transition-colors shrink-0 active:scale-90"
          title="Quitar del carrito"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Bottom row: Unit price / subtotal on left, stepper on right */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#f8f9ff]">
        <div>
          {item.is_wholesale_applied && item.base_sale_price ? (
            <div className="flex items-center gap-1.5">
              <span className="line-through text-xs text-[#ba1a1a] font-mono">${item.base_sale_price.toFixed(2)}</span>
              <span className="font-mono font-bold text-sm text-[#15803d]">${unitPrice.toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-[#7b7487] font-mono text-xs font-semibold">${unitPrice.toFixed(2)} c/u</span>
          )}
          <div className="font-mono font-black text-base sm:text-lg text-[#630ed4] leading-tight">
            ${subtotal}
          </div>
        </div>

        {/* Touch Stepper (Larger and easier to tap) */}
        <div className="flex items-center bg-[#eff4ff] rounded-xl p-1 border border-[#ccc3d8]/50 shrink-0">
          <button
            type="button"
            onClick={handleDecrement}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-[#0b1c30] hover:bg-[#dce9ff] active:scale-90 transition-all shadow-xs"
            title="Disminuir"
          >
            <span className="material-symbols-outlined text-[18px]">
              {(isBulk ? item.quantity <= 0.1 : item.quantity === 1) ? 'delete' : 'remove'}
            </span>
          </button>

          <span className="w-12 text-center text-sm font-black text-[#0b1c30] select-none font-mono">
            {isBulk ? Number(item.quantity).toFixed(3) : item.quantity}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#630ed4] text-white hover:bg-[#7c3aed] active:scale-90 transition-all shadow-xs"
            title="Aumentar"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
