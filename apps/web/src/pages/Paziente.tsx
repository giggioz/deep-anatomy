/**
 * Passo 3 · la pagina da consegnare: il documento con sopra una barra (nascosta in stampa) per i controlli,
 * l'approvazione e, solo dopo l'approvazione, la stampa.
 */
import { useRef } from 'react';
import { CAMPI_TESTO, type Diagnosi } from '@deep-anatomy/shared';
import type { LibreriaPronta } from '../tavole/libreria';
import { PaginaPaziente } from '../components/PaginaPaziente';
import { IcoStampa } from '../components/Icone';
import { aggiornaDiagnosi, segnala } from '../store/diagnosi';
import { link } from '../router';

export function Paziente({ d, lib }: { d: Diagnosi; lib: LibreriaPronta }) {
  const avviso = useRef<HTMLDialogElement>(null);
  const approvata = d.stato === 'approvata';

  // ogni avviso porta dove si sistema
  const avvisi: { testo: string; href: string; azione: string }[] = [];
  const testi = (al: string) => link.passo(d.id, 'diagnosi', al);
  const reperti = link.passo(d.id, 'reperti');
  if (!d.paziente.trim()) avvisi.push({ testo: 'Manca il riferimento del paziente.', href: testi('campo-paziente'), azione: 'Aggiungi' });
  for (const c of CAMPI_TESTO) {
    if (d.testi[c.chiave].trim()) continue;
    const perche = c.chiave === 'terapia' ? 'il paziente non vedrà cosa fare adesso' : 'non comparirà nella pagina';
    avvisi.push({ testo: `Il campo ${c.etichetta} è vuoto: ${perche}.`, href: testi(`testo-${c.chiave}`), azione: 'Aggiungi' });
  }
  if (d.reperti.length === 0) avvisi.push({ testo: 'Nessun reperto: la pagina avrà solo i testi, senza tavole.', href: reperti, azione: 'Aggiungi i reperti' });
  const senza = d.reperti.filter((r) => !r.codice);
  if (senza.length) avvisi.push({ testo: `${senza.length === 1 ? 'Il reperto' : 'I reperti'} ${senza.map((r) => r.n).join(', ')} non ${senza.length === 1 ? 'ha' : 'hanno'} una posizione sulle tavole: ${senza.length === 1 ? 'compare' : 'compaiono'} solo nell'elenco.`, href: reperti, azione: 'Vai ai reperti' });
  const dc = d.da_controllare?.length ?? 0;
  if (dc) avvisi.push({ testo: dc === 1 ? 'C\'è ancora una frase da controllare al passo 1.' : `Ci sono ancora ${dc} frasi da controllare al passo 1.`, href: testi('da-controllare'), azione: 'Controlla' });

  function approva() {
    aggiornaDiagnosi(d.id, (x) => ({ ...x, stato: 'approvata' }), { tieniStato: true });
    segnala('approvata', d);
  }

  function stampa() {
    avviso.current?.close();
    // dopo la chiusura, così il popup non finisce nella stampa
    requestAnimationFrame(() => window.print());
  }

  return (
    <div className={`consegna${approvata ? '' : ' bozza'}`}>
      <div className="consegna-bar">
        <div className="row">
          {approvata
            ? <button type="button" className="btn small" onClick={() => avviso.current?.showModal()}><IcoStampa size={16} /> Stampa o salva in PDF</button>
            : <button type="button" className="btn small primary" onClick={approva}>Approva la diagnosi</button>}
        </div>
      </div>
      {!approvata && (
        <div className="note no-print">
          <b>Bozza: controlla la pagina e approvala per poterla stampare</b>
          {avvisi.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{avvisi.map((a) => <li key={a.testo}>{a.testo} <a href={a.href}>{a.azione} →</a></li>)}</ul>}
        </div>
      )}
      <p className="solo-stampa">Questa diagnosi è ancora una bozza: il medico deve approvarla prima di stamparla.</p>
      <dialog ref={avviso} className="avviso no-print" aria-labelledby="avviso-titolo">
        <h2 id="avviso-titolo">Prima di stampare</h2>
        <p>
          Nella versione completa sarà possibile inviare in modo sicuro il link a questa pagina web, in modo tale che il paziente
          possa avere la migliore comprensione della propria patologia interagendo con le tavole e i reperti.
        </p>
        <div className="avviso-azioni">
          <button type="button" className="btn small" onClick={() => avviso.current?.close()}>Annulla</button>
          <button type="button" className="btn small primary" onClick={stampa} autoFocus><IcoStampa size={16} /> Prosegui alla stampa</button>
        </div>
      </dialog>
      <PaginaPaziente d={d} lib={lib} />
    </div>
  );
}
