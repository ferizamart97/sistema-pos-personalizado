import React from 'react';

export default function CategoryFilter({ selectedCategory, onSelectCategory }) {
  const categories = [
    {
      id: '',
      name: 'Todos',
      type: '',
      icon: 'apps',
      colorActive: 'bg-[#630ed4] text-white shadow-md',
      colorInactive: 'bg-white text-[#0b1c30] hover:bg-[#e5eeff]'
    },
    {
      id: 'dulceria',
      name: 'Dulcería',
      type: 'dulceria',
      icon: 'cake',
      colorActive: 'bg-[#630ed4] text-white shadow-md',
      colorInactive: 'bg-white text-[#0b1c30] hover:bg-[#e5eeff]'
    },
    {
      id: 'materias_primas',
      name: 'Materias Primas',
      type: 'materias_primas',
      icon: 'inventory_2',
      colorActive: 'bg-[#005479] text-white shadow-md',
      colorInactive: 'bg-white text-[#0b1c30] hover:bg-[#e5eeff]'
    },
    {
      id: 'regalos',
      name: 'Regalos',
      type: 'regalos',
      icon: 'card_giftcard',
      colorActive: 'bg-[#a43073] text-white shadow-md',
      colorInactive: 'bg-white text-[#0b1c30] hover:bg-[#e5eeff]'
    }
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.type;
        return (
          <button
            key={cat.id || 'all'}
            type="button"
            onClick={() => onSelectCategory(cat.type)}
            className={`snap-start shrink-0 min-w-[130px] min-h-[64px] p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 border border-[#ccc3d8]/40 ${
              isSelected ? cat.colorActive : cat.colorInactive
            }`}
          >
            <span className="material-symbols-outlined text-[26px]">{cat.icon}</span>
            <span className="text-sm font-bold tracking-tight">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
