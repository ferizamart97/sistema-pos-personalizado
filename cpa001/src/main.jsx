import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster, useToasterStore, toast } from 'react-hot-toast';
import App from './App';
import './styles/global.css';

// Limita las notificaciones visibles a un máximo de 5 de forma automática
function ToastLimitManager({ limit = 5 }) {
  const { toasts } = useToasterStore();

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= limit)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts, limit]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastLimitManager limit={5} />
      <Toaster
        position="top-right"
        containerStyle={{
          top: 10,
          right: 10,
          maxHeight: '260px',
          overflowY: 'auto',
          scrollbarWidth: 'none'
        }}
        toastOptions={{
          duration: 1800,
          style: {
            fontSize: '13px',
            fontWeight: '600',
            padding: '8px 14px',
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            maxWidth: '280px'
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);


// Manejo de Service Worker: En desarrollo desregistramos para HMR instantáneo y evitar errores de caché
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA SW registration failed:', err);
      });
    });
  }
}

