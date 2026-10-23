/** Scelta iniziale: Crea diagnosi o Importa diagnosi, e l'elenco delle diagnosi salvate in questo browser. */
import { useState } from 'react';
import { nomeDistretto } from '@deep-anatomy/shared';
import { IcoCrea, IcoElimina, IcoImporta } from '../components/Icone';
import { link } from '../router';
import { eliminaDiagnosi, useElencoDiagnosi } from '../store/diagnosi';

function quando(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function Home() {
  const elenco = useElencoDiagnosi();
  const [conferma, setConferma] = useState<string | null>(null);
  return (
    <main className="page narrow">
      <div className="head">
        
        <h1>La tua diagnosi, spiegata al paziente.</h1>
        <ul>
          <li>Scrivi o importa la diagnosi</li>
          <li>Indica i reperti sulle tavole anatomiche</li>
          <li>Il paziente riceve una pagina con parole semplici e disegni</li>
        </ul>
      </div>

      <div className="choices">
        <a className="choice" href={link.nuova}>
          <span className="ico"><IcoCrea size={22} /></span>
          <h2>Crea diagnosi</h2>
          <ul>
            <li>Scegli la parte anatomica</li>
            <li>Scrivi la diagnosi</li>
            <li>Tocca sulle tavole anatomiche per segnalare i reperti</li>
          </ul>
          <span className="go">Inizia →</span>
        </a>
        <a className="choice" href={link.importa}>
          <span className="ico"><IcoImporta size={22} /></span>
          <h2>Importa diagnosi (alpha)</h2>
          <p>Incolla il testo di un referto o carica una foto o un PDF: l'intelligenza artificiale precompila lo stesso modulo, tu controlli e correggi.</p>
          <span className="go">Importa →</span>
        </a>
      </div>

      <section className="card stack" aria-labelledby="t-elenco">
        <div className="row between">
          <h2 id="t-elenco" className="eyebrow">Diagnosi create</h2>
          <small className="muted">{elenco.length ? `${elenco.length} salvate` : ''}</small>
        </div>
        <p className="note info">
          Le diagnosi vengono salvate soltanto localmente: nessun salvataggio nel cloud.
        </p>
        {elenco.length === 0 ? (
          <p className="empty">
            Ancora nessuna diagnosi. Per vedere subito il risultato, apri <a href={link.importa}>Importa</a> e scegli un referto di esempio.
          </p>
        ) : (
          <div className="list">
            {elenco.map((d) => (
              <div className="list-row" key={d.id}>
                <div>
                  <a href={d.stato === 'approvata' ? link.passo(d.id, 'paziente') : link.passo(d.id, 'diagnosi')}>
                    <span className="cap">{nomeDistretto(d.distretto, d.lato)}</span>
                    {d.paziente ? ` · ${d.paziente}` : ''}
                  </a>
                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <span className={`pill${d.stato === 'approvata' ? ' ok' : ''}`}>{d.stato === 'approvata' ? 'Approvata' : 'Bozza'}</span>
                    {d.origine === 'importata' && <span className="pill imp">Importata</span>}
                    <small>{d.reperti.length} reperti · {quando(d.aggiornata)}</small>
                  </div>
                </div>
                <div className="row">
                  {d.stato === 'approvata' && <a className="btn small" href={link.passo(d.id, 'paziente')}>Pagina paziente</a>}
                  {conferma === d.id ? (
                    <>
                      <button type="button" className="btn small danger" onClick={() => { eliminaDiagnosi(d.id); setConferma(null); }}>Elimina</button>
                      <button type="button" className="btn small" onClick={() => setConferma(null)}>Annulla</button>
                    </>
                  ) : (
                    <button type="button" className="icon-btn" aria-label="Elimina diagnosi" title="Elimina" onClick={() => setConferma(d.id)}>
                      <IcoElimina size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
