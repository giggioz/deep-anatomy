/**
 * MongoDB per lo sviluppo, senza Docker: lo stesso mongod che usano i test, con i dati in .mongo/ (ignorata da git).
 *   npm run db        resta acceso finché non premi Ctrl+C
 * Nel .env: MONGO_URI=mongodb://127.0.0.1:27027/deep_anatomy
 * Se manca, crea l'account di prova (ACCOUNT_PROVA in packages/shared/src/accesso.ts), già confermato,
 * e alcuni account finti con conteggi, sessioni e stati diversi per vedere la pagina di amministrazione (#/admin).
 * In locale ogni account vede #/admin (vedi adminPerTutti in apps/server/src/index.ts).
 */
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ObjectId } from 'mongodb';
import { ACCOUNT_PROVA } from '../packages/shared/src/accesso.ts';
import { apriArchivio } from '../apps/server/src/db.ts';
import { hashPassword } from '../apps/server/src/password.ts';

const PORTA = 27027;
const dbPath = fileURLToPath(new URL('../.mongo/', import.meta.url));
mkdirSync(dbPath, { recursive: true });

const mongo = await MongoMemoryServer.create({ instance: { port: PORTA, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' } });

const archivio = await apriArchivio(`${mongo.getUri()}deep_anatomy`);
if (!(await archivio.utenti.findOne({ email: ACCOUNT_PROVA.email }))) {
  await archivio.utenti.insertOne({
    _id: new ObjectId(), email: ACCOUNT_PROVA.email, nome: ACCOUNT_PROVA.nome, hash: await hashPassword(ACCOUNT_PROVA.password),
    attivo: true, creato: new Date(), ultimoAccesso: null, tentativi: 0, bloccatoFino: null,
  });
  console.log(`Creato l'account di prova ${ACCOUNT_PROVA.email}`);
}

// account finti per la pagina di amministrazione: stessa password dell'account di prova
const giorno = 24 * 60 * 60 * 1000;
const fa = (giorni) => new Date(Date.now() - giorni * giorno);
const FINTI = [
  { email: 'rossi@esempio.it', nome: 'Dott.ssa Anna Rossi', creato: fa(60), ultimoAccesso: fa(1), ultimaAttivita: fa(0.01), sessioni: 2,
    conteggi: { diagnosi: 42, importate: 15, approvate: 38, importazioni: 19 }, distretti: { ginocchio: 25, spalla: 12, gomito: 5 } },
  { email: 'bianchi@esempio.it', nome: 'Dott. Marco Bianchi', creato: fa(45), ultimoAccesso: fa(3), ultimaAttivita: fa(2), sessioni: 1,
    conteggi: { diagnosi: 17, importate: 0, approvate: 11 }, distretti: { ginocchio: 17 } },
  { email: 'verdi@esempio.it', nome: 'Dott.ssa Giulia Verdi', creato: fa(30), ultimoAccesso: fa(20), ultimaAttivita: fa(18),
    conteggi: { diagnosi: 6, importate: 4, approvate: 2, importazioni: 7 }, distretti: { spalla: 4, gomito: 2 } },
  { email: 'neri@esempio.it', nome: 'Dott. Luca Neri', creato: fa(12), ultimoAccesso: fa(10), attivo: false,
    conteggi: { diagnosi: 1 }, distretti: { ginocchio: 1 } },
  { email: 'gallo@esempio.it', nome: 'Dott. Paolo Gallo', creato: fa(5), ultimoAccesso: fa(4), tentativi: 10, bloccatoFino: new Date(Date.now() + 10 * 60 * 1000) },
  { email: 'conti@esempio.it', nome: '', creato: fa(2), ultimoAccesso: null },
];
const hashProva = await hashPassword(ACCOUNT_PROVA.password);
for (const { sessioni = 0, ...f } of FINTI) {
  if (await archivio.utenti.findOne({ email: f.email })) continue;
  const _id = new ObjectId();
  await archivio.utenti.insertOne({ _id, hash: hashProva, attivo: true, tentativi: 0, bloccatoFino: null, ...f });
  for (let i = 0; i < sessioni; i++) {
    await archivio.sessioni.insertOne({ _id: randomBytes(32).toString('hex'), utente: _id, creata: f.ultimoAccesso, scade: new Date(Date.now() + 14 * giorno) });
  }
  console.log(`Creato l'account finto ${f.email}`);
}
// una registrazione in attesa di conferma (il gettone scade dopo un giorno: la si ricrea a ogni avvio)
if (!(await archivio.gettoni.findOne({ scopo: 'conferma', email: 'ferrari@esempio.it', scade: { $gt: new Date() } }))) {
  await archivio.gettoni.insertOne({ _id: randomBytes(32).toString('hex'), scopo: 'conferma', email: 'ferrari@esempio.it',
    nome: 'Dott.ssa Sara Ferrari', hash: hashProva, scade: new Date(Date.now() + giorno) });
}
await archivio.chiudi();
console.log(`MongoDB di sviluppo su ${mongo.getUri()} (dati in .mongo/). Account di prova: ${ACCOUNT_PROVA.email} / ${ACCOUNT_PROVA.password} (gli account finti @esempio.it hanno la stessa password). Ctrl+C per fermarlo.`);

for (const segnale of ['SIGINT', 'SIGTERM']) {
  process.once(segnale, async () => {
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  });
}
