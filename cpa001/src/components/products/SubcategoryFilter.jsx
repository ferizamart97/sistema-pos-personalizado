import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

export default function SubcategoryFilter({ selectedSubcategory, onSelectSubcategory, categoryType }) {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        setLoading(true);
        const response = await api.get('/subcategories');
        let data = response.data.data || [];
        if (categoryType) {
          data = data.filter((s) => s.category_type === categoryType);
        }
        setSubcategories(data);
      } catch (err) {
        console.error('Error fetching subcategories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubcategories();
  }, [categoryType]);

  if (loading || subcategories.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none snap-x">
      <button
        type="button"
        onClick={() => onSelectSubcategory('')}
        className={`snap-start shrink-0 min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border ${
          selectedSubcategory === ''
            ? 'bg-[#0b1c30] text-white border-[#0b1c30] shadow-xs'
            : 'bg-white text-[#4a4455] border-[#ccc3d8]/60 hover:bg-[#e5eeff]'
        }`}
      >
        Todas las subcategorías
      </button>

      {subcategories.map((sub) => {
        const isSelected = String(selectedSubcategory) === String(sub.id);
        return (
          <button
            key={sub.id}
            type="button"
            onClick={() => onSelectSubcategory(sub.id)}
            className={`snap-start shrink-0 min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border ${
              isSelected
                ? 'bg-[#630ed4] text-white border-[#630ed4] shadow-xs'
                : 'bg-white text-[#4a4455] border-[#ccc3d8]/60 hover:bg-[#e5eeff]'
            }`}
          >
            {sub.name}
          </button>
        );
      })}
    </div>
  );
}
