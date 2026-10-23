/**
 * Database (MongoDB): utenti, sessioni e gettoni dei link inviati per email.
 *
 * Sessioni e gettoni sono salvati con l'hash SHA-256 come _id: chi legge il database non può usarli.
 * Le scadenze sono indici TTL: MongoDB cancella da solo i documenti scaduti (entro un minuto circa),
 * quindi il codice controlla comunque `scade` prima di fidarsi.
 *
 * Una registrazione non ancora confermata non è un utente: è un gettone 'conferma' con nome, email e hash della password.
 * L'utente nasce quando si apre il link. Così nessuno può occupare un'email altrui prima che chi la possiede si registri.
 */
import { MongoClient, type Collection, type Db, type ObjectId } from 'mongodb';

export type UtenteDb = {
  _id: ObjectId;
  /** minuscola, unica */
  email: string;
  nome: string;
  hash: string;
  attivo: boolean;
  creato: Date;
  ultimoAccesso: Date | null;
  /** tentativi di accesso sbagliati di fila: oltre la soglia l'account si blocca per un po' */
  tentativi: number;
  bloccatoFino: Date | null;
};

export type SessioneDb = { _id: string; utente: ObjectId; creata: Date; scade: Date };
export type GettoneDb =
  | { _id: string; scopo: 'recupero'; utente: ObjectId; scade: Date }
  | { _id: string; scopo: 'conferma'; email: string; nome: string; hash: string; scade: Date };

export type Archivio = {
  db: Db;
  utenti: Collection<UtenteDb>;
  sessioni: Collection<SessioneDb>;
  gettoni: Collection<GettoneDb>;
  chiudi: () => Promise<void>;
};

export async function apriArchivio(uri: string, nomeDb?: string): Promise<Archivio> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(nomeDb || undefined);
  const utenti = db.collection<UtenteDb>('utenti');
  const sessioni = db.collection<SessioneDb>('sessioni');
  const gettoni = db.collection<GettoneDb>('gettoni');
  await Promise.all([
    utenti.createIndex({ email: 1 }, { unique: true }),
    sessioni.createIndex({ utente: 1 }),
    sessioni.createIndex({ scade: 1 }, { expireAfterSeconds: 0 }),
    gettoni.createIndex({ utente: 1 }, { sparse: true }),
    gettoni.createIndex({ email: 1 }, { sparse: true }),
    gettoni.createIndex({ scade: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return { db, utenti, sessioni, gettoni, chiudi: () => client.close() };
}
