/**
 * Testi standard per il paziente. Non sono generati: sono frasi fisse, da far validare a un medico
 * insieme alle tavole. La spiegazione di un reperto = descrizione della struttura (dalla libreria)
 * + frase del tipo di reperto. Il medico può sempre scriverne una sua.
 */
import { FONTI, type Fonte, type Peso, type Reperto, type TipoReperto } from './schema.js';
import type { Struttura } from './libreria.js';

export const TIPI: Record<TipoReperto, { etichetta: string; frase: string }> = {
  lesione: {
    etichetta: 'Lesione',
    frase: 'Il medico ha trovato una lesione, cioè un danno o una rottura, in questa struttura.',
  },
  usura: {
    etichetta: 'Usura',
    frase: 'Questa struttura mostra segni di usura o di sofferenza, senza una rottura descritta.',
  },
  edema: {
    etichetta: 'Edema',
    frase: 'In questa zona il tessuto contiene più liquido del normale: è un segno di sofferenza o di sovraccarico.',
  },
  versamento: {
    etichetta: 'Versamento',
    frase: 'Qui si è raccolto più liquido del normale.',
  },
  norma: {
    etichetta: 'Nella norma',
    frase: 'Questa struttura è stata controllata ed è nella norma.',
  },
};

export const PESI: Record<Peso, { etichetta: string; breve: string }> = {
  3: { etichetta: 'Importante', breve: 'Importante' },
  2: { etichetta: 'Moderato', breve: 'Moderato' },
  1: { etichetta: 'Lieve', breve: 'Lieve' },
  0: { etichetta: 'Nella norma', breve: 'Norma' },
};

export const FONTI_ETICHETTE: Record<Fonte, string> = {
  'esame-clinico': 'Visita',
  rm: 'Risonanza',
  ecografia: 'Ecografia',
  rx: 'Radiografia',
  tc: 'TC',
};

/** Le fonti di un reperto in un'unica riga, sempre nello stesso ordine. */
export function etichetteFonti(fonti: readonly Fonte[]): string {
  return FONTI.filter((f) => fonti.includes(f)).map((f) => FONTI_ETICHETTE[f]).join(', ');
}

export function spiegazioneReperto(r: Pick<Reperto, 'tipo' | 'spiegazione'>, s: Struttura | undefined): string {
  if (r.spiegazione && r.spiegazione.trim()) return r.spiegazione.trim();
  const tipo = TIPI[r.tipo].frase;
  return s ? `${s.d} ${tipo}` : tipo;
}

/** Titolo proposto quando il medico sceglie una struttura: "Lesione · Menisco mediale, corno posteriore". */
export function titoloProposto(tipo: TipoReperto, s: Struttura | undefined): string {
  const nome = s ? s.n.replace(/\s*\(.*\)$/, '').replace(' · ', ', ') : 'Struttura';
  return tipo === 'norma' ? `${nome}: nella norma` : `${TIPI[tipo].etichetta} · ${nome}`;
}
