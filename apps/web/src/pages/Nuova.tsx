/** Crea diagnosi · distretto e lato prima di tutto: decidono quali tavole servono. */
import { useState } from 'react';
import type { Distretto, Lato } from '@deep-anatomy/shared';
import { link, vai } from '../router';
import { creaDiagnosi } from '../store/diagnosi';
import { useIndice } from '../tavole/libreria';
import { useUtente } from '../store/accesso';
import { SceltaDistretto } from '../components/SceltaDistretto';

export function Nuova() {
  const indice = useIndice();
  const [distretto, setDistretto] = useState<Distretto>('ginocchio');
  const [lato, setLato] = useState<Lato>('destro');
  const [paziente, setPaziente] = useState('');
  const utente = useUtente();
  const disponibile = !indice || indice.some((v) => v.distretto === distretto && v.lato === lato);
  const compilato = paziente.trim() !== '';

  function crea() {
    const d = creaDiagnosi({ distretto, lato, paziente: paziente.trim(), medico: utente.nome });
    vai(link.passo(d.id, 'diagnosi'));
  }

  return (
    <main className="page narrow">
      <div className="head">
        <a href={link.home} className="eyebrow" style={{ textDecoration: 'none' }}>← Deep Anatomy</a>
        <h1>Crea diagnosi</h1>
      </div>
      <section className="card stack">
        <SceltaDistretto distretto={distretto} lato={lato} onDistretto={setDistretto} onLato={setLato} indice={indice} />
        <div className="grid2">
          <label className="field">
            <span>Riferimento paziente</span>
            <input type="text" value={paziente} onChange={(e) => setPaziente(e.target.value)} placeholder="Es. M.R. 0412" maxLength={40} required />
          </label>
        </div>
        {!disponibile && <p className="note">Le tavole per questo lato non sono ancora nella libreria.</p>}
        {disponibile && !compilato && <p className="note">Inserisci il riferimento del paziente per continuare.</p>}
        <div className="row end">
          <a className="btn" href={link.home}>Annulla</a>
          <button type="button" className="btn primary" onClick={crea} disabled={!disponibile || !compilato}>Crea e continua →</button>
        </div>
      </section>
    </main>
  );
}
