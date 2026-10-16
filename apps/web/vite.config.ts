import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo le chiamate a /api vanno al server (apps/server), che tiene la chiave del modello linguistico.
// La porta del server si legge dal .env alla radice del repo, lo stesso che usa il server.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target: `http://localhost:${env.PORT || 8787}`, changeOrigin: true } },
    },
    base: './',
  };
});
