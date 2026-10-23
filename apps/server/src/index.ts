/**
 * Server di Deep Anatomy: legge il .env alla radice del repo, apre il database e si mette in ascolto.
 *
 * La chiave del modello linguistico (ANTHROPIC_API_KEY), l'accesso al database (MONGO_URI) e l'SMTP restano qui,
 * mai nel browser. Se esiste la build della web app (apps/web/dist), il server la serve anche: un solo processo.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENV = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ENV)) process.loadEnvFile(ENV);

const { creaApp } = await import('./app.js');
const { apriArchivio } = await import('./db.js');
const { modello, aiDisponibile } = await import('./importa.js');

const uri = process.env.MONGO_URI?.trim();
if (!uri) {
  console.error('MONGO_URI assente nel .env: serve il database per gli accessi (vedi .env.example).');
  process.exit(1);
}
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';
const urlApp = process.env.URL_APP?.trim() || 'http://localhost:5173';

const archivio = await apriArchivio(uri, process.env.MONGO_DB);
const app = await creaApp({ archivio, urlApp });
app.addHook('onClose', () => archivio.chiudi());
for (const segnale of ['SIGINT', 'SIGTERM'] as const) process.once(segnale, () => void app.close().then(() => process.exit(0)));

await app.listen({ port, host });
app.log.info(aiDisponibile() ? `Importa usa ${modello()}` : 'ANTHROPIC_API_KEY assente: Importa funziona solo con i referti di esempio');
