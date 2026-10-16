/**
 * Caricamento delle Tavole Anatomiche pregenerate (public/librerie/*.json).
 * Una libreria per distretto e lato; si carica una volta e resta in memoria.
 */
import { useEffect, useState } from 'react';
import {
  fileLibreria, registroCompleto, type Distretto, type Lato, type Libreria, type Struttura,
} from '@deep-anatomy/shared';

export interface LibreriaPronta extends Libreria {
  /** registro con anche i padri delle strutture divise in parti */
  strutture: Record<string, Struttura>;
}

export interface VoceIndice { distretto: Distretto; lato: Lato; nome: string; versione: string; stato: string; file: string }

const cache = new Map<string, Promise<LibreriaPronta>>();

function url(file: string): string {
  return `${import.meta.env.BASE_URL}librerie/${file}`;
}

export function caricaLibreria(distretto: Distretto, lato: Lato): Promise<LibreriaPronta> {
  const file = fileLibreria(distretto, lato);
  let p = cache.get(file);
  if (!p) {
    p = fetch(url(file))
      .then((r) => {
        if (!r.ok) throw new Error(`Libreria ${file} non trovata (${r.status})`);
        return r.json() as Promise<Libreria>;
      })
      .then((lib) => ({ ...lib, strutture: registroCompleto(lib) }));
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p;
}

type Stato<T> = { stato: 'carica' } | { stato: 'ok'; dati: T } | { stato: 'errore'; errore: string };

export function useLibreria(distretto: Distretto | undefined, lato: Lato | undefined): Stato<LibreriaPronta> {
  const [s, setS] = useState<Stato<LibreriaPronta>>({ stato: 'carica' });
  useEffect(() => {
    if (!distretto || !lato) return;
    let vivo = true;
    setS({ stato: 'carica' });
    caricaLibreria(distretto, lato).then(
      (dati) => vivo && setS({ stato: 'ok', dati }),
      (e: unknown) => vivo && setS({ stato: 'errore', errore: e instanceof Error ? e.message : String(e) }),
    );
    return () => { vivo = false; };
  }, [distretto, lato]);
  return s;
}

let indice: Promise<VoceIndice[]> | null = null;
export function useIndice(): VoceIndice[] | null {
  const [v, setV] = useState<VoceIndice[] | null>(null);
  useEffect(() => {
    indice ??= fetch(url('indice.json')).then((r) => (r.ok ? (r.json() as Promise<VoceIndice[]>) : []), () => []);
    let vivo = true;
    indice.then((x) => vivo && setV(x));
    return () => { vivo = false; };
  }, []);
  return v;
}
