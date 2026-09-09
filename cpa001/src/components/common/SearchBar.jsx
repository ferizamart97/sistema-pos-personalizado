import React, { useState, useEffect } from 'react';

export default function SearchBar({ value = '', onChange, placeholder = 'Buscar por nombre, SKU o código...', onScanClick }) {
  const [term, setTerm] = useState(value);

  useEffect(() => {
    setTerm(value);
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setTerm(newVal);
    if (onChange) onChange(newVal);
  };

  const handleClear = () => {
    setTerm('');
    if (onChange) onChange('');
  };

  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-3.5 text-[#7b7487] pointer-events-none flex items-center">
        <span className="material-symbols-outlined text-[24px]">search</span>
      </div>

      <input
        type="text"
        value={term}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full min-h-[46px] pl-11 pr-20 text-sm sm:text-base font-medium bg-white border border-[#ccc3d8]/60 rounded-xl text-[#0b1c30] placeholder-[#7b7487] focus:outline-none focus:ring-2 focus:ring-[#630ed4] focus:border-transparent transition-all shadow-xs"
      />

      <div className="absolute right-3 flex items-center gap-1.5">
        {term && (
          <button
            type="button"
            onClick={handleClear}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#7b7487] hover:bg-[#e5eeff] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
        {onScanClick && (
          <button
            type="button"
            onClick={onScanClick}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#eff4ff] text-[#630ed4] hover:bg-[#dce9ff] active:scale-95 transition-all shadow-sm"
            title="Escanear código de barras"
          >
            <span className="material-symbols-outlined text-[22px]">barcode_scanner</span>
          </button>
        )}
      </div>
    </div>
  );
}
