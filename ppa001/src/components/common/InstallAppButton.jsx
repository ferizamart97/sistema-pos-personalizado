import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export default function InstallAppButton({ className = '' }) {
  const { isInstallable, isStandalone, isIOS, isMacSafari, installApp } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState(
    isIOS ? 'ios' : isMacSafari ? 'mac' : 'desktop'
  );

  // Si ya está ejecutándose como App Standalone independiente, no mostrar el botón
  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await installApp();
      if (!installed) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        type="button"
        title="Instalar panel como aplicación de escritorio / móvil"
        className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 cursor-pointer border border-indigo-400/30 ${className}`}
      >
        <span className="material-symbols-outlined text-[18px] md:text-[20px] animate-bounce">
          download_for_offline
        </span>
        <span className="hidden sm:inline">Descargar App</span>
        <span className="sm:hidden">Instalar App</span>
      </button>

      {/* Modal Guía de Instalación Multiplataforma */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100 text-slate-800">
            {/* Botón Cerrar */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Encabezado */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                <span className="material-symbols-outlined text-2xl">install_mobile</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Instalar Panel Admin</h3>
                <p className="text-xs text-slate-500">Ejecuta sin barras de navegador en tu equipo</p>
              </div>
            </div>

            {/* Pestañas por Dispositivo */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'desktop' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💻 Chrome / Edge
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mac')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'mac' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🍏 Safari Mac
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'ios' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📱 iPhone / iPad
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'android' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🤖 Android
              </button>
            </div>

            {/* Contenido según pestaña */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-5 text-sm space-y-3">
              {activeTab === 'desktop' && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      En la <strong>barra de direcciones (URL)</strong> de Chrome o Edge, busca el icono de instalación <span className="material-symbols-outlined inline text-sm align-middle text-indigo-600 font-bold">download</span> o <span className="material-symbols-outlined inline text-sm align-middle text-indigo-600 font-bold">install_desktop</span> a la derecha.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      O haz clic en el menú <strong>⋮ (Opciones)</strong> de tu navegador &gt; <strong>"Instalar Panel Admin"</strong> o <strong>"Guardar y compartir &gt; Instalar página como app"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Confirma en <strong>"Instalar"</strong> y se abrirá en su propia ventana aislada.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'mac' && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      En Safari, haz clic en el menú superior <strong>Archivo</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Selecciona <strong>"Agregar al Dock..."</strong> (o botón Compartir <span className="material-symbols-outlined inline text-sm align-middle">ios_share</span> &gt; Agregar al Dock).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Haz clic en <strong>"Agregar"</strong>. La app se abrirá desde tu Dock o Launchpad como una aplicación nativa.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Toca el botón <strong>Compartir</strong> (icono <span className="material-symbols-outlined inline text-sm align-middle text-indigo-600 font-bold">ios_share</span> en la barra de Safari).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Toca <strong>"Agregar"</strong> en la esquina superior derecha.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'android' && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Toca el botón de <strong>tres puntos ⋮</strong> en Chrome.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Confirma la instalación para tener el acceso directo sin navegador.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    await installApp();
                    setShowModal(false);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Instalar Ahora
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
