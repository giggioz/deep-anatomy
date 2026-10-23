/**
 * Accesso del medico, verificato dal server. Il browser non vede mai password né gettone di sessione:
 * la sessione è un cookie httpOnly che il server imposta e legge (vedi apps/server/src/accesso.ts).
 *
 * All'avvio si chiede /api/auth/io; finché non risponde lo stato è 'carica'. Se una chiamata /api risponde 401
 * (sessione scaduta, account disattivato) si torna alla pagina di accesso.
 */
import { useSyncExternalStore } from 'react';
import { RispostaUtente, type Utente } from '@deep-anatomy/shared';

export type StatoAccesso = { stato: 'carica' } | { stato: 'fuori' } | { stato: 'dentro'; utente: Utente };

let attuale: StatoAccesso = { stato: 'carica' };
const ascoltatori = new Set<() => void>();
function imposta(s: StatoAccesso) {
  attuale = s;
  ascoltatori.forEach((f) => f());
}

/** fetch verso il server: sessione inclusa, e con 401 si esce */
export async function api(percorso: string, init?: RequestInit): Promise<Response> {
  const r = await fetch(percorso, { credentials: 'same-origin', ...init });
  if (r.status === 401 && !percorso.startsWith('/api/auth/')) imposta({ stato: 'fuori' });
  return r;
}

export type Esito<T> = { ok: true; dati: T } | { ok: false; errore: string; status: number };

/** POST (o GET senza corpo) con risposta JSON; l'errore è già un messaggio da mostrare */
export async function chiedi<T = unknown>(percorso: string, corpo?: object): Promise<Esito<T>> {
  try {
    const r = await api(percorso, corpo
      ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) }
      : undefined);
    const j: unknown = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, dati: j as T };
    const errore = (j as { errore?: string }).errore
      ?? (r.status === 429 ? 'Troppi tentativi. Riprova tra qualche minuto.' : `Il server ha risposto ${r.status}.`);
    return { ok: false, errore, status: r.status };
  } catch {
    return { ok: false, errore: 'Il server non risponde. Controlla la connessione e riprova.', status: 0 };
  }
}

/** Dopo un accesso, una password scelta dal link o cambiata: il server ha aperto la sessione. */
export function entrato(dati: unknown): void {
  const r = RispostaUtente.safeParse(dati);
  if (r.success) imposta({ stato: 'dentro', utente: r.data.utente });
}

export async function controlla(): Promise<void> {
  const r = await chiedi('/api/auth/io');
  if (r.ok) entrato(r.dati);
  else if (r.status === 401) imposta({ stato: 'fuori' });
  else setTimeout(() => void controlla(), 3000); // server irraggiungibile: riprova senza mandare alla pagina di accesso
}

export async function entra(email: string, password: string): Promise<string | null> {
  const r = await chiedi('/api/auth/accesso', { email, password });
  if (!r.ok) return r.errore;
  entrato(r.dati);
  return null;
}

export async function esci(): Promise<void> {
  await chiedi('/api/auth/esci', {});
  imposta({ stato: 'fuori' });
}

function iscrivi(f: () => void) {
  ascoltatori.add(f);
  return () => { ascoltatori.delete(f); };
}

export function useAccesso(): StatoAccesso {
  return useSyncExternalStore(iscrivi, () => attuale);
}

/** Il medico entrato. Solo nelle pagine dietro l'accesso: App non le mostra a chi è fuori. */
export function useUtente(): Utente {
  const a = useAccesso();
  if (a.stato !== 'dentro') throw new Error('useUtente fuori dalle pagine con accesso');
  return a.utente;
}

void controlla();
