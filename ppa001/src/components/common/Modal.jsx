import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', showClose = true }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0b1c30]/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      ></div>

      {/* Modal Container with internal scroll and fixed header */}
      <div
        className={`relative w-full ${maxWidth} max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#ccc3d8]/40 z-10 animate-in fade-in zoom-in-95 duration-200 my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Always Visible) */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5eeff] bg-[#f8f9ff] shrink-0">
            {title && (
              <h3 className="text-lg font-bold text-[#0b1c30] tracking-tight truncate pr-2">{title}</h3>
            )}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7b7487] hover:bg-[#e5eeff] hover:text-[#0b1c30] active:scale-95 transition-all shrink-0 ml-auto"
                title="Cerrar ventana"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            )}
          </div>
        )}

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
