import React from 'react';
import ExpirationBadge from './ExpirationBadge';
import { getProductImageUrl } from '../../utils/imageUrl';

export default function ProductCard({ product, onSelect }) {
  const isOutOfStock = parseInt(product.total_stock || product.stock || 0, 10) <= 0;

  const categoryColorClass = {
    dulceria: 'border-l-4 border-l-[#630ed4]',
    materias_primas: 'border-l-4 border-l-[#005479]',
    regalos: 'border-l-4 border-l-[#a43073]'
  }[product.category_type] || 'border-l-4 border-l-[#630ed4]';

  const getFallbackIcon = () => {
    if (product.category_type === 'dulceria') return 'cake';
    if (product.category_type === 'regalos') return 'card_giftcard';
    if (product.category_type === 'materias_primas') return 'inventory_2';
    return 'shopping_bag';
  };

  const getCategoryDisplay = () => {
    if (product.category_name) return product.category_name;
    if (product.category_type === 'materias_primas') return 'Materias Primas';
    if (product.category_type === 'dulceria') return 'Dulcería';
    if (product.category_type === 'regalos') return 'Regalos';
    return 'General';
  };

  return (
    <div
      onClick={() => !isOutOfStock && onSelect && onSelect(product)}
      className={`relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col border border-[#ccc3d8]/50 select-none active:scale-[0.98] ${categoryColorClass} ${
        isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''
      }`}
    >
      {/* Product Image / Visual Preview */}
      <div className="relative h-28 sm:h-36 md:h-44 w-full bg-[#eff4ff] flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img
            src={getProductImageUrl(product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=300&auto=format&fit=crop&q=60';
            }}
          />
        ) : (
          <span className="material-symbols-outlined text-[40px] sm:text-[56px] text-[#7c3aed]/40">
            {getFallbackIcon()}
          </span>
        )}

        {/* Semáforo de Caducidad (Solo puntito de color limpio sin texto) */}
        {product.semaphore && product.semaphore.days !== null && (
          <div className="absolute top-2 left-2 z-10">
            <ExpirationBadge
              daysRemaining={product.semaphore.days}
              semaphore={product.semaphore.color}
              label={product.semaphore.label}
              dotOnly={true}
            />
          </div>
        )}

        {/* Stock Badge - Extra Large & High Contrast */}
        <div className="absolute top-2 right-2 z-10 bg-[#0b1c30]/90 text-white text-[10px] sm:text-xs md:text-sm font-black font-mono px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl backdrop-blur-xs shadow-md border border-white/20">
          Stock: {product.total_stock !== undefined ? product.total_stock : product.stock || 0} {product.unit || 'pza'}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between gap-1.5 sm:gap-3">
        <div>
          <h4 className="text-xs sm:text-base md:text-lg font-black text-[#0b1c30] line-clamp-2 leading-snug" title={product.name}>
            {product.name}
          </h4>
        </div>

        {/* Bottom row: Category Name on Left, Big Price on Right */}
        <div className="flex items-center justify-between pt-1.5 sm:pt-2.5 border-t border-[#e5eeff] gap-1 sm:gap-2">
          <span className="text-[10px] sm:text-xs md:text-sm font-bold text-[#630ed4] uppercase tracking-wide truncate max-w-[50%]">
            {getCategoryDisplay()}
          </span>
          <span className="text-lg sm:text-2xl md:text-3xl font-black text-[#630ed4] tracking-tight font-mono shrink-0">
            ${parseFloat(product.sale_price || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>

  );
}
