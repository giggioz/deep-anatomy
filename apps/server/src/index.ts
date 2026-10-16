/**
 * Server di Deep Anatomy.
 *
 *   GET  /api/salute    il server risponde? c'è la chiave del modello?
 *   POST /api/importa   referto (testo, foto o PDF) → testi e reperti con codice
 *
 * La chiave del modello linguistico resta qui (variabile ANTHROPIC_API_KEY nel file .env alla radice del repo),
 * mai nel browser. Se esiste la build della web app (apps/web/dist), il server la serve anche: un solo processo.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { RichiestaImporta } from '@deep-anatomy/shared';

const ENV = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ENV)) process.loadEnvFile(ENV);

const { importa, ErroreImporta, modello, aiDisponibile } = await import('./importa.js');

const app = Fastify({
  // i corpi delle richieste non finiscono nei log: possono contenere referti
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  bodyLimit: 15 * 1024 * 1024,
});

app.get('/api/salute', async () => ({ ok: true, ai: aiDisponibile(), modello: aiDisponibile() ? modello() : null }));

app.post('/api/importa', async (req, reply) => {
  const r = RichiestaImporta.safeParse(req.body);
  if (!r.success) return reply.code(400).send({ errore: 'Richiesta non valida.' });
  try {
    return await importa(r.data);
  } catch (e) {
    if (e instanceof ErroreImporta) return reply.code(e.status).send({ errore: e.message });
    req.log.error(e);
    return reply.code(500).send({ errore: 'Errore inatteso del server.' });
  }
});

const WEB = fileURLToPath(new URL('../../web/dist/', import.meta.url));
if (existsSync(WEB)) {
  await app.register(fastifyStatic, { root: WEB });
  app.log.info(`Servo anche la web app da ${WEB}`);
}

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';
await app.listen({ port, host });
app.log.info(aiDisponibile() ? `Importa usa ${modello()}` : 'ANTHROPIC_API_KEY assente: Importa funziona solo con i referti di esempio');
