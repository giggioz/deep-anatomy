/**
 * Hash delle password con scrypt (node:crypto, nessuna dipendenza nativa).
 * Formato salvato: scrypt$N$r$p$sale$hash (base64url), così i parametri si possono alzare in futuro
 * senza invalidare le password già salvate.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash, type ScryptOptions } from 'node:crypto';

const N = 2 ** 17; // parametri consigliati da OWASP per scrypt
const R = 8;
const P = 1;
const LUNGHEZZA = 32;

function scrypt(password: string, sale: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  const opzioni: ScryptOptions = { N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 };
  return new Promise((ok, ko) => scryptCb(password.normalize('NFKC'), sale, LUNGHEZZA, opzioni, (e, k) => (e ? ko(e) : ok(k))));
}

export async function hashPassword(password: string): Promise<string> {
  const sale = randomBytes(16);
  const k = await scrypt(password, sale, N, R, P);
  return ['scrypt', N, R, P, sale.toString('base64url'), k.toString('base64url')].join('$');
}

export async function verificaPassword(password: string, salvato: string): Promise<boolean> {
  const [alg, n, r, p, sale, hash] = salvato.split('$');
  if (alg !== 'scrypt' || !n || !r || !p || !sale || !hash) return false;
  const atteso = Buffer.from(hash, 'base64url');
  const k = await scrypt(password, Buffer.from(sale, 'base64url'), Number(n), Number(r), Number(p));
  return k.length === atteso.length && timingSafeEqual(k, atteso);
}

/** Un hash qualsiasi, per far durare uguale un accesso con email inesistente (non si capisce se l'account c'è). */
let finto: Promise<string> | undefined;
export function hashFinto(): Promise<string> {
  return (finto ??= hashPassword(randomBytes(16).toString('hex')));
}

/** Gettone casuale da mettere in un cookie o in un link, e il suo hash da salvare nel database. */
export function nuovoGettone(): { gettone: string; id: string } {
  const gettone = randomBytes(32).toString('base64url');
  return { gettone, id: impronta(gettone) };
}

export function impronta(gettone: string): string {
  return createHash('sha256').update(gettone).digest('hex');
}
