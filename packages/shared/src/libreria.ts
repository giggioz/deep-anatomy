/**
 * Formato delle Tavole Anatomiche pregenerate (library.json), prodotte dalla skill "tavole-anatomiche".
 * L'app le legge e basta: non le modifica e non genera disegni.
 */
import type { Distretto, Lato } from './schema.js';

export type TipoStruttura =
  | 'osso' | 'muscolo' | 'tendine' | 'legamento' | 'menisco' | 'cartilagine'
  | 'grasso' | 'borsa' | 'fibrocartilagine' | 'capsula';

export const NOMI_TIPI_STRUTTURA: Record<TipoStruttura, string> = {
  osso: 'Ossa', cartilagine: 'Cartilagini', menisco: 'Menischi', fibrocartilagine: 'Fibrocartilagini', legamento: 'Legamenti',
  capsula: 'Capsula', tendine: 'Tendini', muscolo: 'Muscoli', borsa: 'Borse e recessi', grasso: 'Grasso',
};

export interface Struttura {
  /** nome per il paziente */
  n: string;
  k: TipoStruttura;
  /** descrizione semplice della struttura */
  d: string;
  /** codice della struttura padre, per le sottoregioni (es. un corno del menisco) */
  p?: string;
}

export interface Tavola {
  id: string;
  titolo: string;
  /** etichetta della vista, es. "Tavola 1 · Vista da davanti" (vuota per le sezioni) */
  vista: string;
  layout: 'big' | 'mid' | 'sec';
  /** 'insieme' = viste d'insieme; 'radiologo' = sezioni sui piani della RM */
  parte: 'insieme' | 'radiologo';
  testo: string;
  stato: string;
  /** SVG della tavola: ogni struttura è <g class="st" data-id="codice" data-p="padre"> */
  svg: string;
  /** punto in cui disegnare il marcatore numerato di un reperto, in coordinate SVG */
  anchors: Record<string, [number, number]>;
  /** codici presenti in questa tavola */
  ids: string[];
}

export interface Libreria {
  distretto: Distretto;
  nome: string;
  lato: Lato;
  versione: string;
  stato: string;
  generata: string;
  avvisi?: string[];
  registro: Record<string, Struttura>;
  tavole: Tavola[];
}

/** Come si chiama il distretto nelle frasi per il paziente. */
export const DISTRETTI_INFO: Record<Distretto, { nome: string; femminile: boolean }> = {
  ginocchio: { nome: 'ginocchio', femminile: false },
  spalla: { nome: 'spalla', femminile: true },
};

/** "ginocchio destro", "spalla sinistra" */
export function nomeDistretto(distretto: Distretto, lato: Lato): string {
  const i = DISTRETTI_INFO[distretto];
  return `${i.nome} ${i.femminile ? lato.slice(0, -1) + 'a' : lato}`;
}

/** "Il tuo ginocchio destro, spiegato" / "La tua spalla sinistra, spiegata" */
export function titoloPaziente(distretto: Distretto, lato: Lato): string {
  const f = DISTRETTI_INFO[distretto].femminile;
  return `${f ? 'La tua' : 'Il tuo'} ${nomeDistretto(distretto, lato)}, ${f ? 'spiegata' : 'spiegato'}`;
}

export function fileLibreria(distretto: Distretto, lato: Lato): string {
  return `${distretto}-${lato}.json`;
}

/** Il codice o una sua sottoregione compare in questa tavola? */
export function tavolaContiene(t: Tavola, codice: string): boolean {
  return t.ids.some((id) => id === codice || id.startsWith(codice + '-'));
}

/**
 * Strutture divise in parti (un menisco nei suoi corni, il labbro glenoideo nei suoi quadranti): il registro ha le parti,
 * con il padre in "p". Qui si aggiunge il padre come struttura selezionabile, così il medico può indicare "tutto il menisco".
 * Le descrizioni dei padri noti stanno qui finché la libreria non le porterà con sé.
 */
const PADRI_NOTI: Record<string, string> = {
  'menisco-mediale': 'Il cuscinetto a forma di C sul lato interno del ginocchio, tra femore e tibia.',
  'menisco-laterale': 'Il cuscinetto quasi ad anello sul lato esterno del ginocchio, tra femore e tibia.',
  'labbro-glenoideo': "L'anello di fibrocartilagine sul bordo della glena, che rende più profonda la sede dell'omero.",
};

export function registroCompleto(lib: Pick<Libreria, 'registro'>): Record<string, Struttura> {
  const out: Record<string, Struttura> = { ...lib.registro };
  for (const s of Object.values(lib.registro)) {
    if (!s.p || out[s.p]) continue;
    const figlio = s.n.split(' · ')[0] ?? s.n;
    out[s.p] = { n: figlio, k: s.k, d: PADRI_NOTI[s.p] ?? `${figlio}, in tutte le sue parti.` };
  }
  return out;
}

/** Le parti di una struttura (i corni di un menisco). Vuoto se non ha parti. */
export function partiDi(registro: Record<string, Struttura>, codice: string): string[] {
  return Object.keys(registro).filter((c) => c !== codice && registro[c]?.p === codice);
}

/** Codici selezionabili: tutte le strutture del registro, ordinate per tipo e nome. */
export const ORDINE_TIPI: TipoStruttura[] = [
  'osso', 'cartilagine', 'menisco', 'fibrocartilagine', 'legamento', 'capsula', 'tendine', 'muscolo', 'borsa', 'grasso',
];
