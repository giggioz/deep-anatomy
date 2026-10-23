/**
 * Instradamento con l'hash dell'URL: funziona anche aprendo la build da file o da una cartella qualsiasi.
 *   #/                     scelta iniziale
 *   #/nuova                Crea diagnosi: distretto e lato
 *   #/importa              Importa diagnosi
 *   #/d/<id>/diagnosi      1 · i cinque testi (il vecchio …/testi porta qui)
 *   #/d/<id>/reperti       2 · i reperti sulle tavole
 *   #/d/<id>/paziente      3 · la pagina del paziente: controlli, approvazione, stampa (il vecchio …/anteprima porta qui)
 *   …?al=<id>              dopo l'apertura porta al campo con quell'id (es. dagli avvisi del passo 3)
 *   #/account              il tuo account: cambio password, esci
 *   #/admin                tutti gli account, solo per l'amministratore (anche /admin porta qui)
 * Raggiungibili anche senza accesso:
 *   #/registrazione        nuovo account: nome, email, password
 *   #/conferma?t=<gettone> link di conferma dell'email: crea l'account ed entra
 *   #/recupero             password dimenticata: si chiede il link per email
 *   #/password?t=<gettone> nuova password dal link di recupero
 */
import { useSyncExternalStore } from 'react';

export const PASSI = ['diagnosi', 'reperti', 'paziente'] as const;
export type Passo = (typeof PASSI)[number];

export type Rotta =
  | { pagina: 'home' }
  | { pagina: 'nuova' }
  | { pagina: 'importa' }
  | { pagina: 'account' }
  | { pagina: 'admin' }
  | { pagina: 'registrazione' }
  | { pagina: 'conferma'; gettone: string }
  | { pagina: 'recupero' }
  | { pagina: 'password'; gettone: string }
  | { pagina: Passo; id: string }
  | { pagina: 'sconosciuta' };

export function leggiRotta(hash: string): Rotta {
  const parti = hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean);
  if (parti.length === 0) return { pagina: 'home' };
  if (parti[0] === 'nuova') return { pagina: 'nuova' };
  if (parti[0] === 'importa') return { pagina: 'importa' };
  if (parti[0] === 'account') return { pagina: 'account' };
  if (parti[0] === 'admin') return { pagina: 'admin' };
  if (parti[0] === 'registrazione') return { pagina: 'registrazione' };
  if (parti[0] === 'conferma') return { pagina: 'conferma', gettone: parametro(hash, 't') ?? '' };
  if (parti[0] === 'recupero') return { pagina: 'recupero' };
  if (parti[0] === 'password') return { pagina: 'password', gettone: parametro(hash, 't') ?? '' };
  if (parti[0] === 'd' && parti[1]) {
    const p = !parti[2] || parti[2] === 'testi' ? 'diagnosi' : parti[2] === 'anteprima' ? 'paziente' : parti[2];
    if ((PASSI as readonly string[]).includes(p)) return { pagina: p as Passo, id: parti[1] };
  }
  return { pagina: 'sconosciuta' };
}

function iscrivi(f: () => void) {
  window.addEventListener('hashchange', f);
  return () => window.removeEventListener('hashchange', f);
}

export function useRotta(): Rotta {
  const hash = useSyncExternalStore(iscrivi, () => window.location.hash);
  return leggiRotta(hash);
}

/** vai('#/d/abc/reperti') */
export function vai(percorso: string): void {
  window.location.hash = percorso.replace(/^#/, '');
  window.scrollTo({ top: 0 });
}

export const link = {
  home: '#/',
  nuova: '#/nuova',
  importa: '#/importa',
  account: '#/account',
  admin: '#/admin',
  registrazione: '#/registrazione',
  recupero: '#/recupero',
  passo: (id: string, p: Passo, al?: string) => `#/d/${id}/${p}${al ? `?al=${al}` : ''}`,
};

function parametro(hash: string, nome: string): string | null {
  return new URLSearchParams(hash.split('?')[1] ?? '').get(nome);
}

/** l'id indicato da ?al= nell'indirizzo, se c'è */
export function leggiAl(): string | null {
  return parametro(window.location.hash, 'al');
}
