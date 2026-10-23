/**
 * MongoDB per lo sviluppo, senza Docker: lo stesso mongod che usano i test, con i dati in .mongo/ (ignorata da git).
 *   npm run db        resta acceso finché non premi Ctrl+C
 * Nel .env: MONGO_URI=mongodb://127.0.0.1:27027/deep_anatomy
 * Se manca, crea l'account di prova (ACCOUNT_PROVA in packages/shared/src/accesso.ts), già confermato.
 */
import { mkdirSync } from 'node:fs';
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
await archivio.chiudi();
console.log(`MongoDB di sviluppo su ${mongo.getUri()} (dati in .mongo/). Account di prova: ${ACCOUNT_PROVA.email} / ${ACCOUNT_PROVA.password}. Ctrl+C per fermarlo.`);

for (const segnale of ['SIGINT', 'SIGTERM']) {
  process.once(segnale, async () => {
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  });
}
