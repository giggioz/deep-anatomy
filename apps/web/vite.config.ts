import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo le chiamate a /api vanno al server (apps/server), che tiene la chiave del modello linguistico.
// La porta del server si legge dal .env alla radice del repo, lo stesso che usa il server.
// La versione mostrata nel piè di pagina è quella del package.json alla radice del repo.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '');
  const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
  return {
    plugins: [react()],
    define: { __VERSIONE__: JSON.stringify(version) },
    server: {
      port: 5173,
      proxy: { '/api': { target: `http://localhost:${env.PORT || 8787}`, changeOrigin: true } },
    },
    base: './',
  };
});
