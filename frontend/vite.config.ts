/// <reference types="vitest/config" />
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En développement, /api et /ws sont relayés vers la gateway (docker compose up -d) :
// même origine qu'en production, donc aucune configuration CORS.
const GATEWAY = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: GATEWAY, changeOrigin: true },
      '/ws': { target: GATEWAY, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Les tests de page affichent toute l'application (jsdom + interactions utilisateur) :
    // sur une machine chargée, certains dépassent les 5 s par défaut sans être bloqués.
    testTimeout: 15_000,
  },
});
