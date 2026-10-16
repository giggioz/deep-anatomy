/** Passo 3 · anteprima del documento, controlli e approvazione. */
import { useState } from 'react';
import type { Diagnosi } from '@deep-anatomy/shared';
import type { LibreriaPronta } from '../tavole/libreria';
import { PaginaPaziente } from '../components/PaginaPaziente';
import { aggiornaDiagnosi } from '../store/diagnosi';
import { link, vai } from '../router';

export function Anteprima({ d, lib }: { d: Diagnosi; lib: LibreriaPronta }) {
  const [vista, setVista] = useState<'doc' | 'json'>('doc');
  const avvisi: string[] = [];
  if (!d.testi.diagnosi.trim()) avvisi.push('La diagnosi è vuota.');
  if (!d.testi.terapia.trim()) avvisi.push('La terapia è vuota: il paziente non vedrà cosa fare adesso.');
  if (d.reperti.length === 0) avvisi.push('Nessun reperto: la pagina avrà solo i testi, senza tavole.');
  const senza = d.reperti.filter((r) => !r.codice);
  if (senza.length) avvisi.push(`${senza.length === 1 ? 'Il reperto' : 'I reperti'} ${senza.map((r) => r.n).join(', ')} non ${senza.length === 1 ? 'ha' : 'hanno'} una posizione sulle tavole: ${senza.length === 1 ? 'compare' : 'compaiono'} solo nell'elenco.`);
  const dc = d.da_controllare?.length ?? 0;
  if (dc) avvisi.push(dc === 1 ? 'C\'è ancora una frase da controllare al passo 1.' : `Ci sono ancora ${dc} frasi da controllare al passo 1.`);

  function approva() {
    aggiornaDiagnosi(d.id, (x) => ({ ...x, stato: 'approvata' }), { tieniStato: true });
    vai(link.passo(d.id, 'paziente'));
  }

  // ciò che riceve il generatore: i testi e i reperti con codice. Niente disegni.
  const dati = {
    distretto: d.distretto, lato: d.lato, libreria: `${lib.distretto}-${lib.lato} v${lib.versione}`,
    testi: d.testi, reperti: d.reperti,
  };

  return (
    <main className="page">
      <div className="head">
        <div className="eyebrow">Passo 3 di 3 · Anteprima</div>
        <h1>Quello che vedrà il paziente</h1>
        <p>Controlla testi, reperti e tavole. Quando approvi, la pagina è pronta da consegnare; ogni modifica successiva la riporta in bozza.</p>
      </div>

      {avvisi.length > 0 && (
        <div className="note">
          <b>Prima di approvare</b>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{avvisi.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      <div className="preview-bar">
        <div className="seg" role="group" aria-label="Vista">
          <button type="button" aria-pressed={vista === 'doc'} onClick={() => setVista('doc')}>Documento</button>
          <button type="button" aria-pressed={vista === 'json'} onClick={() => setVista('json')}>Dati</button>
        </div>
        <div className="row">
          <a className="btn" href={link.passo(d.id, 'reperti')}>← Reperti</a>
          {d.stato === 'approvata'
            ? <a className="btn primary" href={link.passo(d.id, 'paziente')}>Apri la pagina del paziente →</a>
            : <button type="button" className="btn primary" onClick={approva}>Approva e apri la pagina del paziente →</button>}
        </div>
      </div>

      {vista === 'doc' ? (
        <div className="anteprima-doc"><PaginaPaziente d={d} lib={lib} /></div>
      ) : (
        <div className="stack">
          <p className="muted" style={{ fontSize: 14 }}>È tutto quello che serve per costruire la pagina: i testi e i reperti con il codice della struttura. Le tavole vengono dalla libreria, già pronte.</p>
          <pre className="json">{JSON.stringify(dati, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
