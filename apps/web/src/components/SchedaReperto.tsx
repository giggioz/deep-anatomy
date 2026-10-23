/**
 * La scheda di un reperto: numero, gravità, titolo, la frase del medico e la spiegazione semplice.
 * È la stessa nell'elenco della pagina del paziente e nel popup sui numeri delle tavole.
 */
import type { CSSProperties, ReactNode } from 'react';
import { etichetteFonti, PESI, spiegazioneReperto, type Reperto, type Struttura } from '@deep-anatomy/shared';
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
  dove?: ReactNode;
  as?: 'div' | 'article';
  /** cosa aggiungere in fondo alla scheda, es. il link per approfondire */
  children?: ReactNode;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function SchedaReperto({ r, s, mostraCodice, dove, as = 'div', children, onPointerEnter, onPointerLeave }: Props) {
  const Tag = as;
  const peso = r.tipo === 'norma' ? 0 : r.peso;
  return (
    <Tag className="scheda" style={colori(peso)} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <div className="scheda-top">
        <Numero r={r} />
        <span className="chip">{PESI[peso as 0 | 1 | 2 | 3].etichetta}</span>
        <span className="scheda-fonte">{etichetteFonti(r.fonti)}</span>
        {mostraCodice && r.codice && <code className="scheda-cod">{r.codice}</code>}
      </div>
      <h3>{r.titolo}</h3>
      {r.frase && <p className="scheda-frase">«{r.frase}»</p>}
      {/* la spiegazione standard solo se il medico non ha scritto nulla: la sua frase o la sua spiegazione bastano */}
      {(r.spiegazione?.trim() || !r.frase) && <p className="scheda-sempl">{spiegazioneReperto(r, s)}</p>}
      {(dove || !r.codice) && <p className="scheda-dove">{r.codice ? dove : 'Non indicato sulle tavole'}</p>}
      {children}
    </Tag>
  );
}
