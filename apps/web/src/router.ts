/**
 * Instradamento con l'hash dell'URL: funziona anche aprendo la build da file o da una cartella qualsiasi.
 *   #/                     scelta iniziale
 *   #/nuova                Crea diagnosi: distretto e lato
 *   #/importa              Importa diagnosi
 *   #/d/<id>/testi         1 · i cinque testi
 *   #/d/<id>/reperti       2 · i reperti sulle tavole
 *   #/d/<id>/anteprima     3 · anteprima e approvazione
 *   #/d/<id>/paziente      la pagina da consegnare al paziente
 */
import { useSyncExternalStore } from 'react';

export const PASSI = ['testi', 'reperti', 'anteprima'] as const;
export type Passo = (typeof PASSI)[number];

export type Rotta =
  | { pagina: 'home' }
  | { pagina: 'nuova' }
  | { pagina: 'importa' }
  | { pagina: Passo | 'paziente'; id: string }
  | { pagina: 'sconosciuta' };

export function leggiRotta(hash: string): Rotta {
  const parti = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parti.length === 0) return { pagina: 'home' };
  if (parti[0] === 'nuova') return { pagina: 'nuova' };
  if (parti[0] === 'importa') return { pagina: 'importa' };
  if (parti[0] === 'd' && parti[1]) {
    const p = parti[2] ?? 'testi';
    if ((PASSI as readonly string[]).includes(p) || p === 'paziente') return { pagina: p as Passo | 'paziente', id: parti[1] };
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
  passo: (id: string, p: Passo | 'paziente') => `#/d/${id}/${p}`,
};
