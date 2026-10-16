/**
 * La scheda di un reperto: numero, gravità, titolo, la frase del medico e la spiegazione semplice.
 * È la stessa nell'elenco della pagina del paziente e nel popup sui numeri delle tavole.
 */
import type { CSSProperties } from 'react';
import { FONTI_ETICHETTE, PESI, spiegazioneReperto, type Reperto, type Struttura } from '@deep-anatomy/shared';
import { COLORE_PESO, SFONDO_PESO } from '../tavole/overlay';

export function colori(peso: number): CSSProperties {
  return { '--c': COLORE_PESO[peso], '--soft': SFONDO_PESO[peso] } as CSSProperties;
}

export function Numero({ r }: { r: Pick<Reperto, 'n' | 'peso' | 'tipo'> }) {
  const peso = r.tipo === 'norma' ? 0 : r.peso;
  return (
    <span className={`num${peso === 1 ? ' s1' : ''}`} style={colori(peso)} aria-hidden="true">
      {r.n}
    </span>
  );
}

interface Props {
  r: Reperto;
  s?: Struttura;
  mostraCodice?: boolean;
  /** dove si trova, es. "Tavola 1, 4" */
  dove?: string;
  as?: 'div' | 'article';
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function SchedaReperto({ r, s, mostraCodice, dove, as = 'div', onPointerEnter, onPointerLeave }: Props) {
  const Tag = as;
  const peso = r.tipo === 'norma' ? 0 : r.peso;
  return (
    <Tag className="scheda" style={colori(peso)} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <div className="scheda-top">
        <Numero r={r} />
        <span className="chip">{PESI[peso as 0 | 1 | 2 | 3].etichetta}</span>
        <span className="scheda-fonte">{FONTI_ETICHETTE[r.fonte]}</span>
        {mostraCodice && r.codice && <code className="scheda-cod">{r.codice}</code>}
      </div>
      <h3>{r.titolo}</h3>
      {r.frase && <p className="scheda-frase">«{r.frase}»</p>}
      <p className="scheda-sempl">{spiegazioneReperto(r, s)}</p>
      {(dove || !r.codice) && <p className="scheda-dove">{r.codice ? dove : 'Non indicato sulle tavole'}</p>}
    </Tag>
  );
}
