import React, { useState } from 'react';
import Modal from './Modal';

export default function ExpirationSemaphore({
  daysRemaining,
  semaphore,
  label,
  showLabel = false,
  expirationDate = null,
  productName = '',
  batchNumber = ''
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  let color = semaphore || 'gray';
  let text = label || 'Sin datos';
  let recommendation = 'Sin información de caducidad disponible.';
  let days = null;

  if (daysRemaining !== undefined && daysRemaining !== null && daysRemaining !== '') {
    days = parseInt(daysRemaining, 10);
    if (days <= 0) {
      color = 'black';
      text = 'Caducado';
      recommendation = '¡Lote caducado! Debe retirarse de anaqueles o exhibición de inmediato.';
    } else if (days <= 30) {
      color = 'red';
      text = 'Remates (≤30d)';
      recommendation = 'Caducidad crítica (30 días o menos). Se recomienda aplicar precio de remate o liquidación urgente.';
    } else if (days <= 59) {
      color = 'orange';
      text = 'Promociones (30-59d)';
      recommendation = 'Caducidad cercana (30 a 59 días). Se sugiere armar combos o aplicar promociones de rotación.';
    } else if (days <= 89) {
      color = 'yellow';
      text = 'Vigilar (60-89d)';
      recommendation = 'Lote en observación (60 a 89 días). Colocar al frente en anaquel para respetar rotación FIFO.';
    } else {
      color = 'green';
      text = 'Venta normal (+90d)';
      recommendation = 'Lote fresco con tiempo suficiente para venta regular (+90 días).';
    }
  }

  const badgeStyles = {
    red: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]/30',
    orange: 'bg-[#ffeedd] text-[#ea580c] border-[#ea580c]/30',
    yellow: 'bg-[#fef9c3] text-[#854d0e] border-[#ca8a04]/30',
    green: 'bg-[#dcfce7] text-[#15803d] border-[#16a34a]/30',
    black: 'bg-neutral-900 text-white border-black',
    gray: 'bg-neutral-100 text-neutral-600 border-neutral-200'
  };

  const dotColors = {
    red: 'bg-[#ba1a1a]',
    orange: 'bg-[#ea580c]',
    yellow: 'bg-[#ca8a04]',
    green: 'bg-[#16a34a]',
    black: 'bg-red-500',
    gray: 'bg-neutral-400'
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer ${
          badgeStyles[color] || badgeStyles.gray
        }`}
        title={`${text} - ${days !== null ? `${days} días restantes` : ''} (Clic para ver detalle)`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${dotColors[color] || 'bg-neutral-400'} shrink-0`}></span>
        <span>Ver</span>
      </button>

      {/* Modal de Detalle de Caducidad */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detalle de Caducidad del Lote"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border text-center ${badgeStyles[color] || badgeStyles.gray}`}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-white/60 mb-2 shadow-xs">
              <span className={`w-5 h-5 rounded-full ${dotColors[color] || 'bg-neutral-400'}`}></span>
            </div>
            <h4 className="text-lg font-black">{text}</h4>
            <p className="text-xs mt-0.5 opacity-90 font-mono">
              {days !== null ? `${days} días restantes para caducar` : 'Sin fecha registrada'}
            </p>
          </div>

          <div className="bg-[#f8f9ff] p-3.5 rounded-xl border border-[#ccc3d8]/40 space-y-2 text-xs">
            {productName && (
              <div className="flex justify-between border-b border-[#e5eeff] pb-1.5">
                <span className="text-[#7b7487] font-medium">Producto:</span>
                <span className="font-bold text-[#0b1c30] text-right">{productName}</span>
              </div>
            )}
            {batchNumber && (
              <div className="flex justify-between border-b border-[#e5eeff] pb-1.5">
                <span className="text-[#7b7487] font-medium">Número de Lote:</span>
                <span className="font-bold font-mono text-[#0b1c30]">{batchNumber}</span>
              </div>
            )}
            {expirationDate && (
              <div className="flex justify-between border-b border-[#e5eeff] pb-1.5">
                <span className="text-[#7b7487] font-medium">Fecha de Caducidad:</span>
                <span className="font-bold font-mono text-[#ba1a1a]">{expirationDate}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#7b7487] font-medium">Días Restantes:</span>
              <span className="font-bold font-mono text-[#0b1c30]">{days !== null ? `${days} días` : 'N/A'}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <span className="material-symbols-outlined text-[16px] text-amber-700">lightbulb</span>
              <span>Recomendación Operativa:</span>
            </div>
            <p className="leading-relaxed">{recommendation}</p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="w-full min-h-[40px] bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold active:scale-95 shadow-md"
          >
            Cerrar Detalle
          </button>
        </div>
      </Modal>
    </>
  );
}
