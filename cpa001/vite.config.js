import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: [
      'implement-commence-earlobe.ngrok-free.dev'
    ],
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://api:80',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://api:80',
        changeOrigin: true,
      },
    },
  },
});
