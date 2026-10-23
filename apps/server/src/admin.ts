/**
 * Conteggi d'uso e pagina di amministrazione.
 *
 *   POST /api/attivita         la web app segnala una diagnosi creata o approvata (solo tipo, distretto, origine)
 *   GET  /api/admin/account    tutti gli account con date e conteggi, e le registrazioni in attesa (solo AMMINISTRATORE; in locale tutti)
 *   GET  /admin                porta a /#/admin (la web app usa l'hash per le rotte)
 */
import type { FastifyInstance } from 'fastify';
import type { ObjectId } from 'mongodb';
import { RichiestaAttivita, type RispostaAdmin } from '@deep-anatomy/shared';
import type { Archivio } from './db.js';
import { eAmministratore } from './accesso.js';

/** +1 a un conteggio dell'utente, es. conta(archivio, id, { 'conteggi.importazioni': 1 }) */
export function conta(archivio: Archivio, utente: ObjectId, inc: Record<string, number>) {
  return archivio.utenti.updateOne({ _id: utente }, { $inc: inc });
}

export async function registraAdmin(app: FastifyInstance, archivio: Archivio, adminPerTutti?: boolean): Promise<void> {
  app.get('/admin', async (_req, reply) => reply.redirect('/#/admin'));

  app.post('/api/attivita', async (req, reply) => {
    const r = RichiestaAttivita.safeParse(req.body);
    if (!r.success) return reply.code(400).send({ errore: 'Richiesta non valida.' });
    const { tipo, distretto, origine } = r.data;
    await conta(archivio, req.utente!._id, tipo === 'approvata'
      ? { 'conteggi.approvate': 1 }
      : { 'conteggi.diagnosi': 1, [`distretti.${distretto}`]: 1, ...(origine === 'importata' ? { 'conteggi.importate': 1 } : {}) });
    return { ok: true };
  });

  app.addHook('onRequest', async (req, reply) => {
    // dopo il controllo della sessione (registrato prima in accesso.ts): qui req.utente c'è già
    if (req.url.startsWith('/api/admin/') && !eAmministratore(req.utente, adminPerTutti)) {
      return reply.code(403).send({ errore: 'Pagina riservata all\'amministratore.' });
    }
  });

  app.get('/api/admin/account', async (): Promise<RispostaAdmin> => {
    const ora = new Date();
    const [utenti, sessioni, attesa] = await Promise.all([
      archivio.utenti.find().sort({ creato: -1 }).toArray(),
      archivio.sessioni.aggregate<{ _id: ObjectId; n: number }>([
        { $match: { scade: { $gt: ora } } },
        { $group: { _id: '$utente', n: { $sum: 1 } } },
      ]).toArray(),
      archivio.gettoni.find({ scopo: 'conferma', scade: { $gt: ora } }).sort({ scade: -1 }).toArray(),
    ]);
    const aperte = new Map(sessioni.map((s) => [s._id.toHexString(), s.n]));
    const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
    // la stessa email può avere più registrazioni in attesa: basta la più recente
    const inAttesa = new Map<string, RispostaAdmin['inAttesa'][number]>();
    for (const g of attesa) {
      if (g.scopo === 'conferma' && !inAttesa.has(g.email)) inAttesa.set(g.email, { email: g.email, nome: g.nome, scade: g.scade.toISOString() });
    }
    return {
      account: utenti.map((u) => ({
        email: u.email,
        nome: u.nome,
        attivo: u.attivo,
        bloccatoFino: u.bloccatoFino && u.bloccatoFino > ora ? u.bloccatoFino.toISOString() : null,
        creato: u.creato.toISOString(),
        ultimoAccesso: iso(u.ultimoAccesso),
        ultimaAttivita: iso(u.ultimaAttivita),
        sessioni: aperte.get(u._id.toHexString()) ?? 0,
        diagnosi: u.conteggi?.diagnosi ?? 0,
        importate: u.conteggi?.importate ?? 0,
        approvate: u.conteggi?.approvate ?? 0,
        importazioni: u.conteggi?.importazioni ?? 0,
        distretti: u.distretti ?? {},
      })),
      inAttesa: [...inAttesa.values()],
    };
  });
}
