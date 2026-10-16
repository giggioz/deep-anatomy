/** La pagina da consegnare: solo il documento, con una barra per tornare indietro o stampare (nascosta in stampa). */
import type { Diagnosi } from '@deep-anatomy/shared';
import type { LibreriaPronta } from '../tavole/libreria';
import { PaginaPaziente } from '../components/PaginaPaziente';
import { IcoIndietro, IcoStampa } from '../components/Icone';
import { link } from '../router';

export function Paziente({ d, lib }: { d: Diagnosi; lib: LibreriaPronta }) {
  return (
    <div className="consegna">
      <div className="consegna-bar">
        <a className="btn small" href={link.passo(d.id, 'anteprima')}><IcoIndietro size={16} /> Torna alla diagnosi</a>
        <div className="row">
          {d.stato !== 'approvata' && <span className="demo-tag">Bozza non approvata</span>}
          <button type="button" className="btn small" onClick={() => window.print()}><IcoStampa size={16} /> Stampa o salva in PDF</button>
        </div>
      </div>
      <PaginaPaziente d={d} lib={lib} />
    </div>
  );
}
