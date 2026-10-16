/** Passo 1 · i cinque testi del medico. Il paziente li vedrà tutti, così come sono scritti. */
import { CAMPI_TESTO, type Diagnosi } from '@deep-anatomy/shared';
import { link } from '../router';
import { aggiornaDiagnosi } from '../store/diagnosi';
import { IcoSpunta } from '../components/Icone';

export function Testi({ d }: { d: Diagnosi }) {
  const vuoti = CAMPI_TESTO.filter((c) => !d.testi[c.chiave].trim()).length;
  return (
    <main className="page narrow">
      <div className="head">
        <div className="eyebrow">Passo 1 di 3 · Testi</div>
        <h1>Cosa hai trovato</h1>
        <p>Scrivi come scriveresti il referto. Il paziente vedrà questi testi così come sono, accanto alle spiegazioni semplici e alle tavole.</p>
      </div>

      {d.origine === 'importata' && (
        <div className="note info">
          <b>Precompilato da Importa</b>
          Controlla ogni campo: è una proposta ricavata dal referto, non ancora verificata. Le modifiche si salvano da sole.
        </div>
      )}

      {d.da_controllare && d.da_controllare.length > 0 && (
        <section className="card stack" aria-labelledby="t-ctrl">
          <div className="row between">
            <h2 id="t-ctrl" className="eyebrow" style={{ color: 'var(--s2)' }}>Da controllare · {d.da_controllare.length}</h2>
            <button type="button" className="btn small" onClick={() => aggiornaDiagnosi(d.id, ({ da_controllare: _, ...x }) => x)}>
              <IcoSpunta size={16} /> Controllate
            </button>
          </div>
          <p className="muted" style={{ fontSize: 14 }}>Frasi del referto che non sono diventate reperti. Se serve, aggiungile al passo 2 toccando la struttura sulle tavole.</p>
          <ul className="ctrl">
            {d.da_controllare.map((x, i) => (
              <li key={i}><q>{x.frase}</q><small>{x.motivo}</small></li>
            ))}
          </ul>
        </section>
      )}

      <section className="card stack">
        <div className="grid2">
          <label className="field">
            <span>Riferimento paziente</span>
            <input type="text" value={d.paziente} maxLength={40} placeholder="Iniziali o codice interno"
              onChange={(e) => aggiornaDiagnosi(d.id, (x) => ({ ...x, paziente: e.target.value }))} />
          </label>
          <label className="field">
            <span>Medico</span>
            <input type="text" value={d.medico} maxLength={60} placeholder="Es. Dott. Bianchi"
              onChange={(e) => aggiornaDiagnosi(d.id, (x) => ({ ...x, medico: e.target.value }))} />
          </label>
        </div>
      </section>

      <section className="card stack">
        {CAMPI_TESTO.map((c) => (
          <label className="field" key={c.chiave}>
            <span>{c.etichetta}</span>
            <small>{c.aiuto}</small>
            <textarea
              value={d.testi[c.chiave]}
              rows={c.chiave === 'diagnosi' ? 3 : 4}
              onChange={(e) => aggiornaDiagnosi(d.id, (x) => ({ ...x, testi: { ...x.testi, [c.chiave]: e.target.value } }))}
            />
          </label>
        ))}
      </section>

      <div className="row between">
        <small className="muted">{vuoti ? `${vuoti} ${vuoti === 1 ? 'campo vuoto: non comparirà' : 'campi vuoti: non compariranno'} nella pagina del paziente.` : 'Tutti i campi sono compilati.'}</small>
        <a className="btn primary" href={link.passo(d.id, 'reperti')}>Avanti: reperti →</a>
      </div>
    </main>
  );
}
