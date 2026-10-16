/** Crea diagnosi · distretto e lato prima di tutto: decidono quali tavole servono. */
import { useState } from 'react';
import type { Distretto, Lato } from '@deep-anatomy/shared';
import { link, vai } from '../router';
import { creaDiagnosi } from '../store/diagnosi';
import { useIndice } from '../tavole/libreria';
import { useMedico } from '../store/preferenze';
import { SceltaDistretto } from '../components/SceltaDistretto';

export function Nuova() {
  const indice = useIndice();
  const [distretto, setDistretto] = useState<Distretto>('ginocchio');
  const [lato, setLato] = useState<Lato>('destro');
  const [paziente, setPaziente] = useState('');
  const [medico, setMedico] = useMedico();
  const disponibile = !indice || indice.some((v) => v.distretto === distretto && v.lato === lato);

  function crea() {
    const d = creaDiagnosi({ distretto, lato, paziente: paziente.trim(), medico: medico.trim() });
    vai(link.passo(d.id, 'testi'));
  }

  return (
    <main className="page narrow">
      <div className="head">
        <a href={link.home} className="eyebrow" style={{ textDecoration: 'none' }}>← Deep Anatomy</a>
        <h1>Crea diagnosi</h1>
        <p>Scegli il distretto e il lato: decidono quali tavole anatomiche userai per indicare i reperti.</p>
      </div>
      <section className="card stack">
        <SceltaDistretto distretto={distretto} lato={lato} onDistretto={setDistretto} onLato={setLato} indice={indice} />
        <div className="grid2">
          <label className="field">
            <span>Riferimento paziente</span>
            <small>Iniziali o un codice interno. Nella demo niente dati reali.</small>
            <input type="text" value={paziente} onChange={(e) => setPaziente(e.target.value)} placeholder="Es. M.R. 0412" maxLength={40} />
          </label>
          <label className="field">
            <span>Medico</span>
            <small>Compare sulla pagina del paziente.</small>
            <input type="text" value={medico} onChange={(e) => setMedico(e.target.value)} placeholder="Es. Dott. Bianchi" maxLength={60} />
          </label>
        </div>
        {!disponibile && <p className="note">Le tavole per questo lato non sono ancora nella libreria.</p>}
        <div className="row end">
          <a className="btn" href={link.home}>Annulla</a>
          <button type="button" className="btn primary" onClick={crea} disabled={!disponibile}>Crea e continua →</button>
        </div>
      </section>
    </main>
  );
}
