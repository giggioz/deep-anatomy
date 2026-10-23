/** Distretto e lato, usati da Crea e da Importa. */
import { DISTRETTI, LATI, type Distretto, type Lato } from '@deep-anatomy/shared';
import type { VoceIndice } from '../tavole/libreria';

const INFO: Record<Distretto, string> = {
  ginocchio: 'Menischi, crociati, collaterali, cartilagini, tendini.',
  spalla: 'Cuffia dei rotatori, labbro glenoideo, borsa, acromion-claveare.',
  gomito: 'Epicondili e loro tendini, collaterali, testa del radio, olecrano.',
};

interface Props {
  distretto: Distretto;
  lato: Lato;
  onDistretto: (d: Distretto) => void;
  onLato: (l: Lato) => void;
  indice: VoceIndice[] | null;
}

export function SceltaDistretto({ distretto, lato, onDistretto, onLato, indice }: Props) {
  const tavole = (d: Distretto) => indice?.filter((v) => v.distretto === d) ?? [];
  return (
    <div className="stack">
      <div className="field" role="group" aria-labelledby="l-distretto">
        <span id="l-distretto" style={{ fontWeight: 600 }}>Scegli il distretto</span>
        <div className="opts">
          {DISTRETTI.map((d) => (
            <button key={d} type="button" className="opt" aria-pressed={d === distretto} onClick={() => onDistretto(d)}>
              <b className="cap">{d}</b>
              {/* <small>{INFO[d]}</small> */}
              {indice && <small className="mono">{tavole(d).length ? `libreria ${tavole(d)[0]!.versione} · ${tavole(d)[0]!.stato}` : 'non disponibile'}</small>}
            </button>
          ))}
        </div>
      </div>
      <div className="field" role="group" aria-labelledby="l-lato">
        <span id="l-lato" style={{ fontWeight: 600 }}>Lato</span>
        <div className="seg">
          {LATI.map((l) => (
            <button key={l} type="button" aria-pressed={l === lato} onClick={() => onLato(l)} className="cap">{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
