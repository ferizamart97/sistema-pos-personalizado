import React from 'react';

export default function ExpirationBadge({ daysRemaining, semaphore, label, dotOnly = false, showDays = true, size = 'sm' }) {
  let color = semaphore;
  let text = label;

  if (daysRemaining !== undefined && daysRemaining !== null) {
    const days = parseInt(daysRemaining, 10);
    if (days <= 0) {
      color = 'black';
      text = 'Caducado';
    } else if (days <= 30) {
      color = 'red';
      text = 'Remates (≤30d)';
    } else if (days <= 59) {
      color = 'orange';
      text = 'Promociones (30-59d)';
    } else if (days <= 89) {
      color = 'yellow';
      text = 'Vigilar (60-89d)';
    } else {
      color = 'green';
      text = 'Venta normal (90+d)';
    }
  }

  const dotBgColors = {
    red: 'bg-[#ef4444]',
    orange: 'bg-[#f97316]',
    yellow: 'bg-[#eab308]',
    green: 'bg-[#22c55e]',
    black: 'bg-neutral-900',
    gray: 'bg-neutral-400'
  };

  const colorStyles = {
    red: 'bg-[#ef4444] text-white border-[#dc2626]',
    orange: 'bg-[#f97316] text-white border-[#ea580c]',
    yellow: 'bg-[#eab308] text-[#0b1c30] font-semibold border-[#ca8a04]',
    green: 'bg-[#22c55e] text-white border-[#16a34a]',
    black: 'bg-neutral-900 text-white border-black',
    gray: 'bg-neutral-200 text-neutral-700 border-neutral-300'
  };

  const dotColors = {
    red: 'bg-white',
    orange: 'bg-white',
    yellow: 'bg-neutral-900',
    green: 'bg-white',
    black: 'bg-red-500',
    gray: 'bg-neutral-500'
  };

  const sizeStyles = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  if (dotOnly) {
    const tooltipText = `${text || 'Semáforo de Caducidad'}${daysRemaining !== undefined && daysRemaining !== null ? ` (${daysRemaining} días)` : ''}`;
    return (
      <span
        title={tooltipText}
        className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md inline-block cursor-help ${dotBgColors[color] || 'bg-gray-400'}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border shadow-xs ${colorStyles[color] || colorStyles.gray} ${sizeStyles[size] || sizeStyles.sm}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColors[color] || 'bg-white'} animate-pulse`}></span>
      <span>{text || 'Caducidad'}</span>
      {showDays && daysRemaining !== undefined && daysRemaining !== null && (
        <span className="opacity-90 font-mono text-[11px]">({daysRemaining}d)</span>
      )}
    </span>
  );
}
