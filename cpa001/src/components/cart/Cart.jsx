import React from 'react';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import { useCart } from '../../hooks/useCart';

export default function Cart({ onCheckout, discount, onApplyDiscount, onClose }) {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal, cartCount } = useCart();

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#ccc3d8]/40 shadow-xs">
      {/* Cart Header */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-[#f8f9ff] border-b border-[#e5eeff] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#630ed4] text-[22px] sm:text-[24px]">shopping_cart</span>
          <h3 className="font-extrabold text-base sm:text-lg text-[#0b1c30]">Venta Actual</h3>
          <span className="bg-[#630ed4]/10 text-[#630ed4] text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
            {cartCount} {cartCount === 1 ? 'artículo' : 'artículos'}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-[#ccc3d8]/40 hover:bg-[#eff4ff] text-[#0b1c30] flex items-center justify-center active:scale-90 shadow-xs"
            title="Cerrar carrito"
          >
            <span className="material-symbols-outlined text-[22px]">keyboard_arrow_down</span>
          </button>
        )}
      </div>


      {/* Cart Items Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#7b7487] p-6">
            <span className="material-symbols-outlined text-[64px] text-[#ccc3d8] mb-2">
              point_of_sale
            </span>
            <p className="text-base font-semibold text-[#0b1c30]">El carrito está vacío</p>
            <p className="text-xs text-[#7b7487] mt-1 max-w-[200px]">
              Toca los productos de la izquierda para agregarlos a la venta
            </p>
          </div>
        ) : (
          cartItems.map((item) => (
            <CartItem
              key={item.key || `${item.item_type}-${item.product_id || item.package_id || item.service_id}-${item.fraction_id || 'base'}`}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
            />
          ))
        )}
      </div>

      {/* Cart Summary & Action */}
      <CartSummary
        subtotal={cartTotal}
        cartCount={cartCount}
        onCheckout={onCheckout}
        onClearCart={clearCart}
        discount={discount}
        onApplyDiscount={onApplyDiscount}
      />
    </div>
  );
}
