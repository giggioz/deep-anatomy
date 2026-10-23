/**
 * L'app Fastify, senza mettersi in ascolto: la usano index.ts e i test.
 *
 *   GET  /api/salute    il server risponde? c'è la chiave del modello? (pubblica)
 *   POST /api/importa   referto (testo, foto o PDF) → testi e reperti con codice (serve l'accesso)
 *   /api/auth/*         accesso dei medici, vedi accesso.ts
 *   /api/attivita, /api/admin/*, /admin   conteggi d'uso e amministrazione, vedi admin.ts
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { RichiestaImporta } from '@deep-anatomy/shared';
import { importa, ErroreImporta, modello, aiDisponibile } from './importa.js';
import { registraAccesso } from './accesso.js';
import { conta, registraAdmin } from './admin.js';
import type { Archivio } from './db.js';
import { creaPosta, type Spedisci } from './posta.js';

export type OpzioniApp = { archivio: Archivio; urlApp: string; spedisci?: Spedisci; log?: boolean; limiti?: boolean };

export async function creaApp(o: OpzioniApp): Promise<FastifyInstance> {
  const app = Fastify({
    // i corpi delle richieste non finiscono nei log: possono contenere referti o password
    logger: o.log === false ? false : { level: process.env.LOG_LEVEL ?? 'info' },
    bodyLimit: 15 * 1024 * 1024,
    // dietro nginx (o il proxy di Vite) sulla stessa macchina: l'IP vero arriva in X-Forwarded-For
    trustProxy: '127.0.0.1',
  });

  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'same-origin');
  });

  await registraAccesso(app, { archivio: o.archivio, urlApp: o.urlApp, spedisci: o.spedisci ?? creaPosta(app.log), limiti: o.limiti });

  await registraAdmin(app, o.archivio);

  app.get('/api/salute', { config: { pubblica: true } }, async () => ({ ok: true, ai: aiDisponibile(), modello: aiDisponibile() ? modello() : null }));

  app.post('/api/importa', async (req, reply) => {
    const r = RichiestaImporta.safeParse(req.body);
    if (!r.success) return reply.code(400).send({ errore: 'Richiesta non valida.' });
    try {
      const risposta = await importa(r.data);
      await conta(o.archivio, req.utente!._id, { 'conteggi.importazioni': 1 });
      return risposta;
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

  return app;
}
