/**
 * Accesso dei medici: registrazione libera con conferma dell'email, sessioni con cookie, recupero della password.
 *
 *   GET  /api/auth/io              chi è entrato (401 se nessuno)
 *   POST /api/auth/registrazione   nome + email + password → email con il link di conferma (risponde sempre allo stesso modo)
 *   POST /api/auth/conferma        gettone del link → account creato ed entrato
 *   POST /api/auth/accesso         email + password → cookie di sessione
 *   POST /api/auth/esci            chiude la sessione
 *   POST /api/auth/recupero        email → link per una nuova password (risponde sempre allo stesso modo)
 *   GET  /api/auth/gettone?t=…     il link di recupero è valido? per quale account?
 *   POST /api/auth/reimposta       gettone + password nuova → password salvata ed entrato
 *   POST /api/auth/password        password attuale + nuova (da dentro l'app)
 *
 * Il cookie contiene un gettone casuale; nel database c'è solo il suo hash. È httpOnly (JavaScript non lo legge),
 * SameSite=Strict (niente richieste da altri siti) e Secure quando l'app gira in https.
 * Tutte le altre rotte /api/* chiedono una sessione valida, tranne quelle marcate { config: { pubblica: true } }.
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { ObjectId, MongoServerError } from 'mongodb';
import {
  RichiestaAccesso, RichiestaCambiaPassword, RichiestaConferma, RichiestaRecupero, RichiestaRegistrazione, RichiestaReimposta,
  AMMINISTRATORE, problemaPassword, type Utente,
} from '@deep-anatomy/shared';
import type { Archivio, UtenteDb } from './db.js';
import { hashFinto, hashPassword, impronta, nuovoGettone, verificaPassword } from './password.js';
import { emailConferma, emailGiaRegistrato, emailPasswordCambiata, emailRecupero, type Spedisci } from './posta.js';

const COOKIE = 'da_sessione';
const GIORNO = 24 * 60 * 60 * 1000;
/** la sessione dura 14 giorni dall'ultimo uso: si rinnova quando ne resta meno della metà */
const DURATA_SESSIONE = 14 * GIORNO;
const DURATA_CONFERMA = GIORNO;
const DURATA_RECUPERO = 60 * 60 * 1000;
/** oltre queste registrazioni in attesa per la stessa email non partono altre email (niente caselle intasate) */
const MAX_IN_ATTESA = 5;
/** dopo 10 password sbagliate di fila l'account resta bloccato 15 minuti */
const MAX_TENTATIVI = 10;
const BLOCCO = 15 * 60 * 1000;
/** ultimaAttivita si scrive al massimo ogni 5 minuti, non a ogni richiesta */
const PASSO_ATTIVITA = 5 * 60 * 1000;

declare module 'fastify' {
  interface FastifyRequest { utente: UtenteDb | null }
  interface FastifyContextConfig { pubblica?: boolean }
}

export type OpzioniAccesso = {
  archivio: Archivio;
  spedisci: Spedisci;
  urlApp: string;
  /** limite di richieste per IP sulle rotte di accesso: si spegne solo nei test */
  limiti?: boolean;
  /** in locale (URL_APP su localhost) ogni account è amministratore, per provare #/admin */
  adminPerTutti?: boolean;
};

export const eAmministratore = (u: UtenteDb | null, adminPerTutti?: boolean) => !!u && (adminPerTutti || u.email === AMMINISTRATORE);

/** I link delle email: il gettone sta dopo il #, quindi non finisce nei log del server né nel Referer. */
const linkApp = (urlApp: string, percorso: string) => `${urlApp.replace(/\/+$/, '')}/#/${percorso}`;

export async function registraAccesso(app: FastifyInstance, o: OpzioniAccesso): Promise<void> {
  const { archivio } = o;
  const sicuro = o.urlApp.startsWith('https://');
  const pubblico = (u: UtenteDb): Utente => ({ email: u.email, nome: u.nome, ...(eAmministratore(u, o.adminPerTutti) ? { amministratore: true } : {}) });

  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  app.decorateRequest('utente', null);

  function apriSessione(reply: FastifyReply, utente: ObjectId, scade = new Date(Date.now() + DURATA_SESSIONE)) {
    const { gettone, id } = nuovoGettone();
    reply.setCookie(COOKIE, gettone, { path: '/', httpOnly: true, sameSite: 'strict', secure: sicuro, expires: scade });
    return archivio.sessioni.insertOne({ _id: id, utente, creata: new Date(), scade });
  }

  function chiudiCookie(reply: FastifyReply) {
    reply.clearCookie(COOKIE, { path: '/', httpOnly: true, sameSite: 'strict', secure: sicuro });
  }

  // Ogni richiesta /api: legge la sessione dal cookie; se la rotta non è pubblica e manca, 401.
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return;
    const gettone = req.cookies[COOKIE];
    if (gettone) {
      const id = impronta(gettone);
      const s = await archivio.sessioni.findOne({ _id: id, scade: { $gt: new Date() } });
      const u = s && (await archivio.utenti.findOne({ _id: s.utente, attivo: true }));
      if (s && u) {
        req.utente = u;
        if (!u.ultimaAttivita || Date.now() - u.ultimaAttivita.getTime() > PASSO_ATTIVITA) {
          await archivio.utenti.updateOne({ _id: u._id }, { $set: { ultimaAttivita: new Date() } });
        }
        if (s.scade.getTime() - Date.now() < DURATA_SESSIONE / 2) {
          const scade = new Date(Date.now() + DURATA_SESSIONE);
          await archivio.sessioni.updateOne({ _id: id }, { $set: { scade } });
          reply.setCookie(COOKIE, gettone, { path: '/', httpOnly: true, sameSite: 'strict', secure: sicuro, expires: scade });
        }
      } else {
        chiudiCookie(reply);
      }
    }
    if (!req.utente && !req.routeOptions.config?.pubblica) {
      return reply.code(401).send({ errore: 'Accesso richiesto.' });
    }
  });

  const pubblica = { pubblica: true };
  const limite = (max: number): { rateLimit?: { max: number; timeWindow: string } } =>
    (o.limiti === false ? {} : { rateLimit: { max, timeWindow: '15 minutes' } });
  const nonValida = (reply: FastifyReply) => reply.code(400).send({ errore: 'Richiesta non valida.' });

  app.get('/api/auth/io', async (req) => ({ utente: pubblico(req.utente!) }));

  app.post('/api/auth/registrazione', { config: { ...pubblica, ...limite(5) } }, async (req, reply) => {
    // il motivo preciso se è la password a non andare, prima del controllo generico
    const corpo = (req.body ?? {}) as { password?: unknown; email?: unknown };
    const problema = typeof corpo.password === 'string'
      ? problemaPassword(corpo.password, typeof corpo.email === 'string' ? corpo.email : undefined) : null;
    if (problema) return reply.code(400).send({ errore: problema });
    const r = RichiestaRegistrazione.safeParse(req.body);
    if (!r.success) return nonValida(reply);
    const { nome, email, password } = r.data;
    // l'hash si calcola sempre: la risposta dura uguale che l'email abbia già un account o no
    const hash = await hashPassword(password);
    try {
      if (await archivio.utenti.findOne({ email })) {
        await o.spedisci(emailGiaRegistrato(email, linkApp(o.urlApp, ''), linkApp(o.urlApp, 'recupero')));
      } else if ((await archivio.gettoni.countDocuments({ scopo: 'conferma', email })) < MAX_IN_ATTESA) {
        const { gettone, id } = nuovoGettone();
        await archivio.gettoni.insertOne({ _id: id, scopo: 'conferma', email, nome, hash, scade: new Date(Date.now() + DURATA_CONFERMA) });
        await o.spedisci(emailConferma(email, nome, linkApp(o.urlApp, `conferma?t=${gettone}`), DURATA_CONFERMA / 3_600_000));
      }
    } catch (e) {
      req.log.error(e, 'email di registrazione non inviata');
    }
    return { ok: true };
  });

  app.post('/api/auth/conferma', { config: { ...pubblica, ...limite(10) } }, async (req, reply) => {
    const r = RichiestaConferma.safeParse(req.body);
    if (!r.success) return nonValida(reply);
    // findOneAndDelete: il link vale una volta sola anche se due richieste arrivano insieme
    const g = await archivio.gettoni.findOneAndDelete({ _id: impronta(r.data.gettone), scopo: 'conferma', scade: { $gt: new Date() } });
    if (!g || g.scopo !== 'conferma') {
      return reply.code(404).send({ errore: 'Il link di conferma non è più valido. Se l\'hai già usato, accedi con email e password; altrimenti ripeti la registrazione.' });
    }
    const u: UtenteDb = {
      _id: new ObjectId(), email: g.email, nome: g.nome, hash: g.hash, attivo: true,
      creato: new Date(), ultimoAccesso: new Date(), tentativi: 0, bloccatoFino: null,
    };
    try {
      await archivio.utenti.insertOne(u);
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) {
        return reply.code(409).send({ errore: 'Questo account è già confermato: accedi con email e password.' });
      }
      throw e;
    }
    // le altre registrazioni in attesa per la stessa email non servono più
    await archivio.gettoni.deleteMany({ scopo: 'conferma', email: g.email });
    await apriSessione(reply, u._id);
    return { utente: pubblico(u) };
  });

  app.post('/api/auth/accesso', { config: { ...pubblica, ...limite(20) } }, async (req, reply) => {
    const r = RichiestaAccesso.safeParse(req.body);
    if (!r.success) return nonValida(reply);
    const sbagliate = () => reply.code(401).send({ errore: 'Email o password non corrette.' });
    const u = await archivio.utenti.findOne({ email: r.data.email });
    if (!u || !u.attivo) {
      await verificaPassword(r.data.password, await hashFinto()); // stessa durata di un tentativo vero
      return sbagliate();
    }
    if (u.bloccatoFino && u.bloccatoFino > new Date()) {
      return reply.code(429).send({ errore: 'Troppi tentativi sbagliati. Riprova tra qualche minuto, o recupera la password.' });
    }
    if (!(await verificaPassword(r.data.password, u.hash))) {
      const tentativi = u.tentativi + 1;
      await archivio.utenti.updateOne({ _id: u._id }, {
        $set: { tentativi: tentativi >= MAX_TENTATIVI ? 0 : tentativi, bloccatoFino: tentativi >= MAX_TENTATIVI ? new Date(Date.now() + BLOCCO) : null },
      });
      return sbagliate();
    }
    await archivio.utenti.updateOne({ _id: u._id }, { $set: { tentativi: 0, bloccatoFino: null, ultimoAccesso: new Date() } });
    await apriSessione(reply, u._id);
    return { utente: pubblico(u) };
  });

  app.post('/api/auth/esci', { config: pubblica }, async (req, reply) => {
    const gettone = req.cookies[COOKIE];
    if (gettone) await archivio.sessioni.deleteOne({ _id: impronta(gettone) });
    chiudiCookie(reply);
    return { ok: true };
  });

  app.post('/api/auth/recupero', { config: { ...pubblica, ...limite(5) } }, async (req, reply) => {
    const r = RichiestaRecupero.safeParse(req.body);
    if (!r.success) return nonValida(reply);
    const u = await archivio.utenti.findOne({ email: r.data.email, attivo: true });
    if (u) {
      try {
        // un link nuovo annulla quelli vecchi
        const { gettone, id } = nuovoGettone();
        await archivio.gettoni.deleteMany({ scopo: 'recupero', utente: u._id });
        await archivio.gettoni.insertOne({ _id: id, scopo: 'recupero', utente: u._id, scade: new Date(Date.now() + DURATA_RECUPERO) });
        await o.spedisci(emailRecupero(u.email, linkApp(o.urlApp, `password?t=${gettone}`), DURATA_RECUPERO / 60_000));
      } catch (e) {
        req.log.error(e, 'email di recupero non inviata');
      }
    }
    // stessa risposta che l'account esista o no
    return { ok: true };
  });

  async function leggiGettone(gettone: string) {
    const g = await archivio.gettoni.findOne({ _id: impronta(gettone), scopo: 'recupero', scade: { $gt: new Date() } });
    const u = g?.scopo === 'recupero' ? await archivio.utenti.findOne({ _id: g.utente, attivo: true }) : null;
    return g && u ? { g, u } : null;
  }

  app.get<{ Querystring: { t?: string } }>('/api/auth/gettone', { config: { ...pubblica, ...limite(30) } }, async (req, reply) => {
    const v = req.query.t && (await leggiGettone(req.query.t));
    if (!v) return reply.code(404).send({ errore: 'Il link non è più valido. Chiedine uno nuovo.' });
    return { email: v.u.email };
  });

  app.post('/api/auth/reimposta', { config: { ...pubblica, ...limite(10) } }, async (req, reply) => {
    const r = RichiestaReimposta.safeParse(req.body);
    if (!r.success) return nonValida(reply);
    const v = await leggiGettone(r.data.gettone);
    if (!v) return reply.code(404).send({ errore: 'Il link non è più valido. Chiedine uno nuovo.' });
    const problema = problemaPassword(r.data.password, v.u.email);
    if (problema) return reply.code(400).send({ errore: problema });
    // il gettone vale una volta sola: se due richieste arrivano insieme, solo la prima lo cancella
    const usato = await archivio.gettoni.deleteOne({ _id: v.g._id });
    if (usato.deletedCount !== 1) return reply.code(404).send({ errore: 'Il link non è più valido. Chiedine uno nuovo.' });
    await archivio.utenti.updateOne({ _id: v.u._id }, {
      $set: { hash: await hashPassword(r.data.password), tentativi: 0, bloccatoFino: null, ultimoAccesso: new Date() },
    });
    await archivio.sessioni.deleteMany({ utente: v.u._id });
    await apriSessione(reply, v.u._id);
    o.spedisci(emailPasswordCambiata(v.u.email)).catch((e) => req.log.error(e, 'avviso di password cambiata non inviato'));
    return { utente: pubblico(v.u) };
  });

  app.post('/api/auth/password', { config: limite(10) }, async (req, reply) => {
    const r = RichiestaCambiaPassword.safeParse(req.body);
    if (!r.success) return nonValida(reply);
    const u = req.utente!;
    if (!(await verificaPassword(r.data.attuale, u.hash))) {
      return reply.code(400).send({ errore: 'La password attuale non è corretta.' });
    }
    const problema = problemaPassword(r.data.nuova, u.email);
    if (problema) return reply.code(400).send({ errore: problema });
    await archivio.utenti.updateOne({ _id: u._id }, { $set: { hash: await hashPassword(r.data.nuova) } });
    // gli altri dispositivi escono, questo resta dentro con una sessione nuova
    await archivio.sessioni.deleteMany({ utente: u._id });
    await apriSessione(reply, u._id);
    o.spedisci(emailPasswordCambiata(u.email)).catch((e) => req.log.error(e, 'avviso di password cambiata non inviato'));
    return { utente: pubblico(u) };
  });
}
