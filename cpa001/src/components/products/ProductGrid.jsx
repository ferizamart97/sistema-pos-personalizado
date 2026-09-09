import React from 'react';
import ProductCard from '../common/ProductCard';

export default function ProductGrid({ products, loading, error, onSelectProduct }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 p-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#e5eeff] animate-pulse h-56 flex flex-col justify-between">
            <div className="h-36 bg-[#eff4ff] rounded-xl w-full"></div>
            <div className="space-y-2 mt-3">
              <div className="h-5 bg-[#eff4ff] rounded-md w-3/4"></div>
              <div className="h-5 bg-[#eff4ff] rounded-md w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#ffdad6] text-[#ba1a1a]">
        <span className="material-symbols-outlined text-[48px] mb-2">error</span>
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-[#ccc3d8]/40 text-[#7b7487]">
        <span className="material-symbols-outlined text-[56px] text-[#ccc3d8] mb-2">
          inventory_2
        </span>
        <p className="text-base font-semibold text-[#0b1c30]">No se encontraron productos</p>
        <p className="text-xs text-[#7b7487] mt-1">Prueba seleccionando otra categoría o limpiando la búsqueda</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 pb-20">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelectProduct}
        />
      ))}
    </div>
  );
}
