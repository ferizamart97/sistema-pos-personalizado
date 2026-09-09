import React from 'react';

export default function TouchButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button',
  fullWidth = false,
  size = 'md',
  icon = null
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 select-none cursor-pointer";

  const sizeStyles = {
    sm: "min-h-[40px] px-3 py-2 text-sm gap-1.5",
    md: "min-h-[48px] px-5 py-3 text-base gap-2",
    lg: "min-h-[56px] px-6 py-4 text-lg font-semibold gap-2.5",
    xl: "min-h-[64px] px-8 py-5 text-xl font-bold gap-3"
  };

  const variants = {
    primary: "bg-[#630ed4] hover:bg-[#7c3aed] text-white shadow-md hover:shadow-lg active:bg-[#520bb3]",
    secondary: "bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] active:bg-[#cbdbf5] border border-[#ccc3d8]/40",
    dulceria: "bg-[#630ed4] hover:bg-[#7c3aed] text-white shadow-md",
    materias: "bg-[#005479] hover:bg-[#006d9c] text-white shadow-md",
    regalos: "bg-[#a43073] hover:bg-[#fc79bd] text-white shadow-md",
    success: "bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-md active:bg-[#15803d]",
    danger: "bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-md",
    warning: "bg-[#f97316] hover:bg-[#ea580c] text-white shadow-md",
    outline: "border-2 border-[#630ed4] text-[#630ed4] hover:bg-[#630ed4]/10",
    ghost: "text-[#4a4455] hover:bg-[#e5eeff] active:bg-[#dce9ff]"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variants[variant] || variants.primary} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[24px]">{icon}</span>}
      {children}
    </button>
  );
}
