/**
 * Le diagnosi della demo, salvate nel browser (localStorage).
 * Nessun server, nessun dato che esce dal computer del medico. In produzione questo diventa un'API con login.
 * Se il browser non permette di salvare (navigazione privata, permessi), si lavora in memoria.
 */
import { useSyncExternalStore } from 'react';
import { Diagnosi, TESTI_VUOTI, type Distretto, type Lato } from '@deep-anatomy/shared';
import { z } from 'zod';

const CHIAVE = 'deep-anatomy:diagnosi:v1';
const Elenco = z.array(Diagnosi);

let memoria: Diagnosi[] | null = null;
const ascoltatori = new Set<() => void>();

function leggiTutte(): Diagnosi[] {
  if (memoria) return memoria;
  try {
    const raw = localStorage.getItem(CHIAVE);
    const ok = raw ? Elenco.safeParse(JSON.parse(raw)) : null;
    memoria = ok?.success ? ok.data : [];
  } catch {
    memoria = [];
  }
  return memoria;
}

function scriviTutte(tutte: Diagnosi[]): void {
  memoria = tutte;
  try { localStorage.setItem(CHIAVE, JSON.stringify(tutte)); } catch { /* resta in memoria */ }
  ascoltatori.forEach((f) => f());
}

function iscrivi(f: () => void): () => void {
  ascoltatori.add(f);
  const altraScheda = (e: StorageEvent) => { if (e.key === CHIAVE) { memoria = null; f(); } };
  window.addEventListener('storage', altraScheda);
  return () => { ascoltatori.delete(f); window.removeEventListener('storage', altraScheda); };
}

export function useElencoDiagnosi(): Diagnosi[] {
  return useSyncExternalStore(iscrivi, leggiTutte);
}

export function useDiagnosi(id: string | undefined): Diagnosi | undefined {
  const tutte = useElencoDiagnosi();
  return id ? tutte.find((d) => d.id === id) : undefined;
}

function nuovoId(): string {
  try { return crypto.randomUUID().slice(0, 8); } catch { return Math.random().toString(36).slice(2, 10); }
}

export function creaDiagnosi(dati: {
  distretto: Distretto; lato: Lato; paziente: string; medico: string; origine?: Diagnosi['origine'];
} & Partial<Pick<Diagnosi, 'testi' | 'reperti' | 'da_controllare'>>): Diagnosi {
  const ora = new Date().toISOString();
  const d: Diagnosi = {
    id: nuovoId(), creata: ora, aggiornata: ora, origine: dati.origine ?? 'creata',
    distretto: dati.distretto, lato: dati.lato, paziente: dati.paziente, medico: dati.medico,
    testi: dati.testi ?? { ...TESTI_VUOTI }, reperti: dati.reperti ?? [], stato: 'bozza',
    ...(dati.da_controllare?.length ? { da_controllare: dati.da_controllare } : {}),
  };
  scriviTutte([d, ...leggiTutte()]);
  return d;
}

/** Ogni modifica riporta la diagnosi in bozza: va riapprovata prima di consegnarla. */
export function aggiornaDiagnosi(id: string, f: (d: Diagnosi) => Diagnosi, opz: { tieniStato?: boolean } = {}): void {
  scriviTutte(leggiTutte().map((d) => {
    if (d.id !== id) return d;
    const n = f(d);
    return { ...n, aggiornata: new Date().toISOString(), stato: opz.tieniStato ? n.stato : 'bozza' };
  }));
}

export function eliminaDiagnosi(id: string): void {
  scriviTutte(leggiTutte().filter((d) => d.id !== id));
}
