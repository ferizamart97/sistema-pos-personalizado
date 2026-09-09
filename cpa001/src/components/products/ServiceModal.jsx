import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import TouchButton from '../common/TouchButton';

export default function ServiceModal({ isOpen, onClose, service, onAddService }) {
  const [price, setPrice] = useState('0.00');

  useEffect(() => {
    if (service && isOpen) {
      const initial = service.base_price !== undefined && service.base_price !== null
        ? parseFloat(service.base_price).toFixed(2)
        : '0.00';
      setPrice(initial);
    }
  }, [service, isOpen]);

  if (!service) return null;

  const handleKeypad = (val) => {
    if (val === 'C') {
      setPrice('0');
    } else if (val === 'backspace') {
      setPrice((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (val === '.') {
      if (!price.includes('.')) setPrice((prev) => prev + '.');
    } else {
      setPrice((prev) => (prev === '0' ? String(val) : prev + val));
    }
  };

  const handleApply = () => {
    const finalPrice = parseFloat(price) || 0;
    if (finalPrice <= 0) {
      toast.error('El costo del servicio debe ser mayor a $0');
      return;
    }
    onAddService(service, finalPrice);
    toast.success(`Servicio "${service.name}" agregado por $${finalPrice.toFixed(2)}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cobro de Servicio: ${service.name}`} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="p-3.5 bg-[#eff4ff] rounded-2xl text-sm text-[#4a4455] border border-[#ccc3d8]/40">
          <p className="font-bold text-[#0b1c30] text-sm sm:text-base">{service.name}</p>
          <p className="text-xs sm:text-sm text-[#7b7487] mt-0.5">{service.description || 'Servicio de precio flexible según requerimiento del cliente.'}</p>
          <p className="text-xs sm:text-sm font-semibold text-[#0284c7] mt-1">
            Precio base registrado: <strong>${parseFloat(service.base_price || 0).toFixed(2)}</strong>
          </p>
        </div>

        {/* Display Price Input */}
        <div className="p-4 bg-[#f8f9ff] border-2 border-[#005479] rounded-2xl flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-[#0b1c30] uppercase">Monto a Cobrar ($):</span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-[#005479]">${price}</div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypad(key)}
              className={`min-h-[52px] rounded-2xl font-mono text-xl font-black flex items-center justify-center active:scale-95 transition-all shadow-xs ${
                key === 'C'
                  ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30'
                  : 'bg-white text-[#0b1c30] border border-[#ccc3d8]/60 hover:bg-[#eff4ff]'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <TouchButton
          onClick={handleApply}
          variant="primary"
          size="lg"
          fullWidth
          icon="add_task"
          className="min-h-[52px] text-sm font-black"
        >
          Agregar Servicio al Carrito
        </TouchButton>
      </div>
    </Modal>
  );
}
