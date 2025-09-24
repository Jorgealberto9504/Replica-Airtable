// apps/frontend/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Permite setear hosts por .env (coma-separados) o usa lista por defecto
  const extraAllowed = (env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);

  return {
    plugins: [react()],
    server: {
      host: true,                 // escucha en 0.0.0.0
      port: 5173,
      // AGREGA AQUÍ tu dominio del túnel:
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '::1',
        'localhost:5173',
        ...extraAllowed,
      ],
      // (Opcional) HMR por el túnel para que el WS funcione fuera de tu red
      hmr: env.VITE_PUBLIC_DEV_HOST
        ? {
            host: env.VITE_PUBLIC_DEV_HOST, // ej: mitsubishi-vat-excerpt-ensures.trycloudflare.com
            protocol: 'wss',
            port: 443,
          }
        : undefined,
    },
    preview: {
      host: true,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '::1',
        'localhost:5173',
        ...extraAllowed,
      ],
    },
  };
});