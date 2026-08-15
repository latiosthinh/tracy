import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Web-only Vite configuration (no Electron)
export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      // Proxy API routes to Express backend during development
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist-web',
      emptyOutDir: true,
      // Web build doesn't need to externalize Node-only packages
      // since we're not bundling for Electron
    },
  };
});
