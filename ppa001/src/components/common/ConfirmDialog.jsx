import React, { useState } from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  title = 'Gestionar Eliminación',
  itemName = 'este elemento',
  isActive = true,
  onToggleActive,
  onHardDelete,
  loading = false
}) {
  const [confirmText, setConfirmText] = useState('');
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false);

  const handleToggle = async () => {
    if (onToggleActive) {
      await onToggleActive();
      onClose();
    }
  };

  const handleHardDelete = async () => {
    if (confirmText !== 'ELIMINAR') return;
    if (onHardDelete) {
      await onHardDelete();
      setConfirmText('');
      setShowHardDeleteConfirm(false);
      onClose();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setShowHardDeleteConfirm(false);
    onClose();
  };


  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-md">
      {!showHardDeleteConfirm ? (
        <div className="space-y-4">
          <div className="p-4 bg-[#eff4ff] rounded-2xl border border-[#ccc3d8]/40 text-center">
            <span className="material-symbols-outlined text-[48px] text-[#630ed4] mb-1">
              help
            </span>
            <h4 className="text-base font-bold text-[#0b1c30]">
              ¿Qué acción deseas realizar sobre <span className="text-[#630ed4]">{itemName}</span>?
            </h4>
            <p className="text-xs text-[#7b7487] mt-1">
              Puedes deshabilitarlo temporalmente o borrarlo permanentemente de la base de datos.
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Action 1: Soft Delete / Toggle */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={loading}
              className={`w-full min-h-[52px] px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between transition-all active:scale-98 shadow-xs ${
                isActive
                  ? 'bg-[#f97316] hover:bg-[#ea580c] text-white'
                  : 'bg-[#22c55e] hover:bg-[#16a34a] text-white'
              }`}
            >
              <div className="flex items-center gap-2 text-left">
                <span className="material-symbols-outlined">
                  {isActive ? 'visibility_off' : 'visibility'}
                </span>
                <div>
                  <div className="leading-tight">{isActive ? 'Deshabilitar' : 'Habilitar'}</div>
                  <div className="text-[10px] font-normal opacity-90">
                    {isActive
                      ? 'Oculta el producto de las ventas sin borrar histórico'
                      : 'Reactiva el producto para la venta'}
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>

            {/* Action 2: Trigger Hard Delete */}
            <button
              type="button"
              onClick={() => setShowHardDeleteConfirm(true)}
              disabled={loading}
              className="w-full min-h-[52px] px-4 py-3 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] rounded-xl font-bold text-sm flex items-center justify-between transition-all active:scale-98 border border-[#ba1a1a]/20"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="material-symbols-outlined">delete_forever</span>
                <div>
                  <div className="leading-tight">Eliminar Permanentemente</div>
                  <div className="text-[10px] font-normal text-[#ba1a1a]/80">
                    Borra todos los registros asociados de forma definitiva
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 text-xs font-semibold text-[#7b7487] hover:text-[#0b1c30]"
          >
            Cancelar y volver
          </button>
        </div>
      ) : (
        /* Hard Delete Double Confirmation */
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 bg-[#ffdad6] rounded-2xl border border-[#ba1a1a] text-center text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[48px] mb-1">warning</span>
            <h4 className="text-base font-black">¡ADVERTENCIA CRÍTICA!</h4>
            <p className="text-xs mt-1 text-[#410002]">
              Esta acción <strong>NO se puede deshacer</strong>. Se eliminará <span className="font-bold">{itemName}</span> y todos sus datos relacionados.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1c30]">
              Escribe <span className="text-[#ba1a1a] font-mono font-black">ELIMINAR</span> para confirmar:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full min-h-[44px] px-3 bg-[#f8f9ff] border border-[#ba1a1a] rounded-xl text-sm font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowHardDeleteConfirm(false)}
              className="min-h-[44px] px-4 rounded-xl bg-neutral-200 text-neutral-800 text-xs font-bold hover:bg-neutral-300 active:scale-95"
            >
              Regresar
            </button>
            <button
              type="button"
              onClick={handleHardDelete}
              disabled={confirmText !== 'ELIMINAR' || loading}
              className="min-h-[44px] px-4 rounded-xl bg-[#ba1a1a] text-white text-xs font-bold hover:bg-[#93000a] disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-md"
            >
              {loading ? 'Eliminando...' : 'Sí, Eliminar Todo'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
