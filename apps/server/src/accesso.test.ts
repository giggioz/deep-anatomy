/**
 * Test dell'accesso: Mongo in memoria, richieste vere all'app (senza rete), email raccolte in un array.
 *   npm test -w @deep-anatomy/server
 */
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { creaApp } from './app.js';
import { apriArchivio, type Archivio } from './db.js';
import type { Email } from './posta.js';

const URL_APP = 'https://deepanatomy.test';
const EMAIL = 'medico@esempio.it';
const NOME = 'Dott.ssa Rossi';
const PASSWORD = 'una-password-lunga';

let mongo: MongoMemoryServer;
let archivio: Archivio;
let app: FastifyInstance;
const posta: Email[] = [];
const spedisci = async (e: Email) => { posta.push(e); };

/** il gettone dentro l'ultimo link inviato per email, es. ultimoGettone('conferma') */
function ultimoGettone(pagina: 'conferma' | 'password'): string {
  const m = posta.at(-1)?.testo.match(new RegExp(`#/${pagina}\\?t=([\\w-]+)`));
  assert.ok(m, `nessun link #/${pagina} nell'ultima email`);
  return m[1]!;
}

function cookieDi(r: LightMyRequestResponse): string {
  const c = r.cookies.find((c) => c.name === 'da_sessione');
  assert.ok(c?.value, 'nessun cookie di sessione');
  return `da_sessione=${c.value}`;
}

const post = (url: string, body: object, cookie?: string) =>
  app.inject({ method: 'POST', url, payload: body, headers: cookie ? { cookie } : {} });
const io = (cookie: string) => app.inject({ url: '/api/auth/io', headers: { cookie } });

const registra = (email = EMAIL, password = PASSWORD, nome = NOME) => post('/api/auth/registrazione', { nome, email, password });

/** registrazione + conferma: restituisce il cookie della sessione aperta */
async function medicoConfermato(): Promise<string> {
  await registra();
  const r = await post('/api/auth/conferma', { gettone: ultimoGettone('conferma') });
  assert.equal(r.statusCode, 200);
  return cookieDi(r);
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  archivio = await apriArchivio(mongo.getUri(), 'test');
  app = await creaApp({ archivio, urlApp: URL_APP, log: false, limiti: false, spedisci });
});

after(async () => {
  await app.close();
  await archivio.chiudi();
  await mongo.stop();
});

beforeEach(async () => {
  posta.length = 0;
  await Promise.all([archivio.utenti.deleteMany({}), archivio.sessioni.deleteMany({}), archivio.gettoni.deleteMany({})]);
});

describe('protezione delle API', () => {
  test('senza sessione: /api/importa e /api/auth/io rispondono 401, /api/salute no', async () => {
    assert.equal((await post('/api/importa', {})).statusCode, 401);
    assert.equal((await app.inject('/api/auth/io')).statusCode, 401);
    assert.equal((await app.inject('/api/salute')).statusCode, 200);
  });

  test('un cookie inventato non apre niente', async () => {
    assert.equal((await io('da_sessione=inventato')).statusCode, 401);
  });
});

describe('registrazione', () => {
  test('registrazione → email di conferma → link → account creato e si è dentro', async () => {
    const r = await registra();
    assert.equal(r.statusCode, 200);
    assert.equal(posta.length, 1);
    assert.equal(posta[0]!.a, EMAIL);
    assert.equal(await archivio.utenti.countDocuments(), 0, 'prima della conferma l\'account non esiste');

    const c = await post('/api/auth/conferma', { gettone: ultimoGettone('conferma') });
    assert.equal(c.statusCode, 200);
    const cookie = c.cookies.find((c) => c.name === 'da_sessione')!;
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, 'Strict');
    assert.deepEqual((await io(cookieDi(c))).json(), { utente: { email: EMAIL, nome: NOME } });
  });

  test('senza conferma non si entra', async () => {
    await registra();
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: PASSWORD })).statusCode, 401);
  });

  test('il link di conferma vale una volta sola', async () => {
    await registra();
    const gettone = ultimoGettone('conferma');
    assert.equal((await post('/api/auth/conferma', { gettone })).statusCode, 200);
    assert.equal((await post('/api/auth/conferma', { gettone })).statusCode, 404);
  });

  test('un link di conferma scaduto non vale', async () => {
    await registra();
    await archivio.gettoni.updateMany({}, { $set: { scade: new Date(Date.now() - 1000) } });
    assert.equal((await post('/api/auth/conferma', { gettone: ultimoGettone('conferma') })).statusCode, 404);
  });

  test('password corta o uguale all\'email: 400 con il motivo, nessuna email', async () => {
    const a = await registra(EMAIL, 'corta');
    assert.equal(a.statusCode, 400);
    assert.match(a.json().errore, /almeno 10/);
    assert.equal((await registra(EMAIL, EMAIL)).statusCode, 400);
    assert.equal((await post('/api/auth/registrazione', { email: EMAIL, password: PASSWORD })).statusCode, 400, 'manca il nome');
    assert.equal(posta.length, 0);
  });

  test('email già registrata: stessa risposta, al proprietario arriva un avviso e niente cambia', async () => {
    await medicoConfermato();
    posta.length = 0;
    const r = await registra(EMAIL, 'password-dell-intruso', 'Intruso');
    const nuovo = await registra('nuovo@esempio.it');
    assert.deepEqual([r.statusCode, r.json()], [nuovo.statusCode, nuovo.json()]);
    assert.match(posta[0]!.oggetto, /già un account/);
    assert.ok(!posta[0]!.testo.includes('#/conferma'), 'l\'avviso non contiene link di conferma');
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: PASSWORD })).statusCode, 200);
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: 'password-dell-intruso' })).statusCode, 401);
  });

  test('chi registra per primo un\'email altrui non la occupa: vale il link che il proprietario apre', async () => {
    await registra(EMAIL, 'password-dell-intruso', 'Intruso');
    await registra(EMAIL, PASSWORD, NOME); // il vero proprietario
    assert.equal((await post('/api/auth/conferma', { gettone: ultimoGettone('conferma') })).statusCode, 200);
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: 'password-dell-intruso' })).statusCode, 401);
    assert.equal(await archivio.gettoni.countDocuments({ scopo: 'conferma' }), 0, 'le altre registrazioni in attesa spariscono');
  });

  test('oltre 5 registrazioni in attesa per la stessa email non partono altre email', async () => {
    for (let i = 0; i < 7; i++) await registra();
    assert.equal(posta.length, 5);
  });
});

describe('accesso e uscita', () => {
  test('email (anche maiuscola) e password giuste: dentro; esci: fuori', async () => {
    await medicoConfermato();
    const r = await post('/api/auth/accesso', { email: '  Medico@Esempio.IT ', password: PASSWORD });
    assert.equal(r.statusCode, 200);
    const cookie = cookieDi(r);
    assert.equal((await io(cookie)).statusCode, 200);
    await post('/api/auth/esci', {}, cookie);
    assert.equal((await io(cookie)).statusCode, 401);
  });

  test('password sbagliata ed email inesistente danno lo stesso errore', async () => {
    await medicoConfermato();
    const a = await post('/api/auth/accesso', { email: EMAIL, password: 'sbagliata-sbagliata' });
    const b = await post('/api/auth/accesso', { email: 'nessuno@esempio.it', password: 'sbagliata-sbagliata' });
    assert.equal(a.statusCode, 401);
    assert.deepEqual(a.json(), b.json());
  });

  test('dopo 10 password sbagliate l\'account si blocca, anche con la password giusta', async () => {
    await medicoConfermato();
    await archivio.utenti.updateOne({ email: EMAIL }, { $set: { tentativi: 9 } });
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: 'sbagliata-sbagliata' })).statusCode, 401);
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: PASSWORD })).statusCode, 429);
  });

  test('un account disattivato non entra e perde le sessioni aperte', async () => {
    const cookie = await medicoConfermato();
    await archivio.utenti.updateOne({ email: EMAIL }, { $set: { attivo: false } });
    assert.equal((await io(cookie)).statusCode, 401);
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: PASSWORD })).statusCode, 401);
  });
});

describe('limite di richieste', () => {
  test('oltre 20 tentativi di accesso in 15 minuti dallo stesso IP: 429', async () => {
    const conLimiti = await creaApp({ archivio, urlApp: URL_APP, log: false, spedisci });
    try {
      const prova = () => conLimiti.inject({ method: 'POST', url: '/api/auth/accesso', payload: { email: 'x@esempio.it', password: 'x' } });
      for (let i = 0; i < 20; i++) assert.equal((await prova()).statusCode, 401);
      assert.equal((await prova()).statusCode, 429);
    } finally {
      await conLimiti.close();
    }
  });
});

describe('recupero della password', () => {
  test('stessa risposta per email esistente e inesistente; email solo a chi esiste', async () => {
    await medicoConfermato();
    posta.length = 0;
    const a = await post('/api/auth/recupero', { email: EMAIL });
    const b = await post('/api/auth/recupero', { email: 'nessuno@esempio.it' });
    assert.deepEqual([a.statusCode, a.json()], [b.statusCode, b.json()]);
    assert.equal(posta.length, 1);
    assert.equal(posta[0]!.a, EMAIL);
  });

  test('nuova password dal link: la vecchia non vale più, le altre sessioni si chiudono, arriva l\'avviso', async () => {
    const vecchiaSessione = await medicoConfermato();
    await post('/api/auth/recupero', { email: EMAIL });
    assert.deepEqual((await app.inject(`/api/auth/gettone?t=${ultimoGettone('password')}`)).json(), { email: EMAIL });

    const r = await post('/api/auth/reimposta', { gettone: ultimoGettone('password'), password: 'nuova-password-lunga' });
    assert.equal(r.statusCode, 200);
    assert.match(posta.at(-1)!.oggetto, /cambiata/);
    assert.equal((await io(vecchiaSessione)).statusCode, 401);
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: PASSWORD })).statusCode, 401);
    assert.equal((await post('/api/auth/accesso', { email: EMAIL, password: 'nuova-password-lunga' })).statusCode, 200);
  });

  test('il link vale una volta sola, e uno più nuovo annulla quello vecchio', async () => {
    await medicoConfermato();
    await post('/api/auth/recupero', { email: EMAIL });
    const primo = ultimoGettone('password');
    await post('/api/auth/recupero', { email: EMAIL });
    const secondo = ultimoGettone('password');
    assert.equal((await app.inject(`/api/auth/gettone?t=${primo}`)).statusCode, 404);
    assert.equal((await post('/api/auth/reimposta', { gettone: secondo, password: 'nuova-password-lunga' })).statusCode, 200);
    assert.equal((await post('/api/auth/reimposta', { gettone: secondo, password: 'altra-password-lunga' })).statusCode, 404);
  });

  test('un link scaduto non vale', async () => {
    await medicoConfermato();
    await post('/api/auth/recupero', { email: EMAIL });
    await archivio.gettoni.updateMany({}, { $set: { scade: new Date(Date.now() - 1000) } });
    assert.equal((await post('/api/auth/reimposta', { gettone: ultimoGettone('password'), password: 'nuova-password-lunga' })).statusCode, 404);
  });

  test('un link di conferma non serve a reimpostare la password', async () => {
    await registra();
    assert.equal((await post('/api/auth/reimposta', { gettone: ultimoGettone('conferma'), password: 'nuova-password-lunga' })).statusCode, 404);
  });
});

describe('cambio password da dentro l\'app', () => {
  test('serve la password attuale; dopo il cambio questa sessione resta, le altre no', async () => {
    const altra = await medicoConfermato();
    const questa = cookieDi(await post('/api/auth/accesso', { email: EMAIL, password: PASSWORD }));

    assert.equal((await post('/api/auth/password', { attuale: 'sbagliata', nuova: 'nuova-password-lunga' }, questa)).statusCode, 400);
    const r = await post('/api/auth/password', { attuale: PASSWORD, nuova: 'nuova-password-lunga' }, questa);
    assert.equal(r.statusCode, 200);
    assert.equal((await io(cookieDi(r))).statusCode, 200);
    assert.equal((await io(altra)).statusCode, 401);
  });

  test('senza sessione: 401', async () => {
    assert.equal((await post('/api/auth/password', { attuale: PASSWORD, nuova: 'nuova-password-lunga' })).statusCode, 401);
  });
});

describe('nel database', () => {
  test('niente password né gettoni in chiaro, nemmeno nelle registrazioni in attesa', async () => {
    await registra('attesa@esempio.it');
    const g = await archivio.gettoni.findOne({ scopo: 'conferma' });
    assert.ok(g?.scopo === 'conferma' && g.hash.startsWith('scrypt$') && !g.hash.includes(PASSWORD));
    assert.match(g._id, /^[0-9a-f]{64}$/);

    await medicoConfermato();
    const u = await archivio.utenti.findOne({ email: EMAIL });
    assert.match(u!.hash, /^scrypt\$/);
    assert.ok(!u!.hash.includes(PASSWORD));
    assert.match((await archivio.sessioni.findOne({}))!._id, /^[0-9a-f]{64}$/);
  });
});
