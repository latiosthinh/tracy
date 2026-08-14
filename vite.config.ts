import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['playwright-core', 'chromium-bidi', 'playwright', 'js-yaml', '@google/genai']
              }
            }
          }
        },
        preload: {
          input: 'electron/preload.ts',
        },
        renderer: process.env.NODE_ENV === 'test' ? undefined : {},
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    ssr: {
      external: ['playwright-core', 'chromium-bidi', 'js-yaml', '@google/genai']
    }
  };
});
