/**
 * Gestione degli account dei medici, da riga di comando (sul server, con il .env di produzione).
 * Gli account li creano i medici registrandosi dall'app; qui si controllano e si bloccano.
 *
 *   npm run utenti -- elenco                    tutti gli account, e le registrazioni in attesa di conferma
 *   npm run utenti -- disattiva <email>         non può più entrare; le sue sessioni si chiudono
 *   npm run utenti -- riattiva <email>
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Email } from '@deep-anatomy/shared';

const ENV = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ENV)) process.loadEnvFile(ENV);

const { apriArchivio } = await import('./db.js');

const [comando, arg] = process.argv.slice(2);
const USO = 'Uso: npm run utenti -- elenco | disattiva <email> | riattiva <email>';

const uri = process.env.MONGO_URI?.trim();
if (!uri) { console.error('MONGO_URI assente nel .env.'); process.exit(1); }
const archivio = await apriArchivio(uri, process.env.MONGO_DB);

function email(): string {
  const e = Email.safeParse(arg);
  if (!e.success) { console.error(`Email non valida: ${arg ?? '(mancante)'}\n${USO}`); process.exit(1); }
  return e.data;
}

try {
  switch (comando) {
    case 'elenco': {
      const tutti = await archivio.utenti.find().sort({ creato: 1 }).toArray();
      if (!tutti.length) console.log('Nessun account: il primo si crea registrandosi dall\'app.');
      for (const u of tutti) {
        const stato = u.attivo ? 'attivo' : 'disattivato';
        const ultimo = u.ultimoAccesso ? u.ultimoAccesso.toISOString().slice(0, 16).replace('T', ' ') : 'mai';
        console.log(`${u.email.padEnd(36)} ${(u.nome || '-').padEnd(28)} ${stato.padEnd(12)} ultimo accesso: ${ultimo}`);
      }
      const attesa = await archivio.gettoni.distinct('email', { scopo: 'conferma', scade: { $gt: new Date() } });
      if (attesa.length) console.log(`\nIn attesa di conferma dell'email: ${attesa.join(', ')}`);
      break;
    }
    case 'disattiva':
    case 'riattiva': {
      const e = email();
      const attivo = comando === 'riattiva';
      const u = await archivio.utenti.findOneAndUpdate({ email: e }, { $set: { attivo } });
      if (!u) { console.error(`Nessun account con email ${e}.`); process.exitCode = 1; break; }
      if (!attivo) await archivio.sessioni.deleteMany({ utente: u._id });
      console.log(`${e}: ${attivo ? 'riattivato' : 'disattivato, sessioni chiuse'}.`);
      break;
    }
    default:
      console.error(USO);
      process.exitCode = 1;
  }
} finally {
  await archivio.chiudi();
}
