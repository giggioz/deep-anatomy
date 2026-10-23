/**
 * Il documento per il paziente, come lo vede il medico al passo 3 e come esce in stampa.
 *
 * Ordine: intestazione, la diagnosi, gli altri quattro testi del medico (tutti visibili al paziente),
 * poi le tavole che contengono almeno un reperto, divise in viste d'insieme e viste del radiologo,
 * con accanto l'elenco numerato dei reperti. Le tavole senza reperti non compaiono.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  CAMPI_TESTO, PESI, nomeDistretto, tavolaContiene, titoloPaziente,
  type Diagnosi, type Reperto, type Tavola as TTavola,
} from '@deep-anatomy/shared';
import type { LibreriaPronta } from '../tavole/libreria';
import { Tavola } from '../tavole/Tavola';
import { Numero, SchedaReperto, colori } from './SchedaReperto';

const TITOLI_PAZIENTE: Record<string, string> = {
  anamnesi: 'La tua storia',
  esame_obiettivo: 'Cosa ha trovato alla visita',
  esame_strumentale: 'Cosa mostrano gli esami',
  terapia: 'Cosa fare adesso',
};

function data(iso: string): string {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; }
}

/** segnaposto della demo: la pagina giusta per ogni reperto va concordata con il medico */
const LINK_APPROFONDIMENTO = 'https://www.edoardogajortopedico.com/patologie-spalla/lesione-slap-spalla/';

const idTavola = (id: string) => `tavola-${id}`;

/** "Tavola 2" o "Tavole 1, 3 e 4": ogni numero porta alla sua tavola. */
function elencoTavole(ts: { id: string; n: number }[]): ReactNode {
  const vai = (id: string) => document.getElementById(idTavola(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const link = (t: { id: string; n: number }) => (
    <button key={t.id} type="button" className="link-tavola" onClick={() => vai(t.id)}>{t.n}</button>
  );
  if (ts.length === 1) return <>Tavola {link(ts[0]!)}</>;
  const resto = ts.slice(0, -1);
  return (
    <>Tavole {resto.map((t, i) => <span key={t.id}>{i > 0 && ', '}{link(t)}</span>)} e {link(ts[ts.length - 1]!)}</>
  );
}

export function PaginaPaziente({ d, lib }: { d: Diagnosi; lib: LibreriaPronta }) {
  const [evid, setEvid] = useState<string | null>(null);
  const S = lib.strutture;

  const { insieme, radiologo, numeri } = useMemo(() => {
    const conReperti = lib.tavole.filter((t) => d.reperti.some((r) => r.codice && tavolaContiene(t, r.codice)));
    const ins = conReperti.filter((t) => t.parte !== 'radiologo');
    const rm = conReperti.filter((t) => t.parte === 'radiologo');
    const num = new Map<string, number>();
    [...ins, ...rm].forEach((t, i) => num.set(t.id, i + 1));
    return { insieme: ins, radiologo: rm, numeri: num };
  }, [lib, d.reperti]);

  function dove(r: Reperto): ReactNode {
    if (!r.codice) return undefined;
    const ts = [...insieme, ...radiologo].filter((t) => tavolaContiene(t, r.codice!)).map((t) => ({ id: t.id, n: numeri.get(t.id)! }));
    return ts.length ? elencoTavole(ts) : 'Non compare nelle tavole di questo documento';
  }

  const testi = CAMPI_TESTO.filter((c) => c.chiave !== 'diagnosi' && d.testi[c.chiave].trim());
  const nome = nomeDistretto(d.distretto, d.lato);
  const [prima, dopo] = titoloPaziente(d.distretto, d.lato).split(nome);

  const tavola = (t: TTavola): ReactNode => (
    <Tavola tavola={t} strutture={S} reperti={d.reperti.filter((r) => r.codice && tavolaContiene(t, r.codice))} evidenzia={evid} />
  );

  return (
    <article className="doc">
      <header className="doc-top">
        <div>
          <div className="eyebrow">La tua visita, spiegata</div>
          <h1>{prima}<em>{nome}</em>{dopo}</h1>
          <p>
            Questa pagina spiega con parole semplici e con alcuni disegni la diagnosi del tuo ortopedico.
          </p>
        </div>
        <dl className="doc-id">
          {d.paziente && (<><dt>Paziente</dt><dd>{d.paziente}</dd></>)}
          {d.medico && (<><dt>Medico</dt><dd>{d.medico}</dd></>)}
          <dt>Data</dt><dd>{data(d.aggiornata)}</dd>
          <dt>Reperti</dt><dd>{d.reperti.length}</dd>
        </dl>
      </header>

      {d.testi.diagnosi.trim() && (
        <section className="doc-diagnosi" aria-labelledby="t-diagnosi">
          <div className="eyebrow" id="t-diagnosi">La diagnosi</div>
          <p className="doc-diagnosi-testo">{d.testi.diagnosi}</p>
          {d.reperti.length > 0 && (
            <ul className="doc-sintesi" aria-label="I reperti in sintesi">
              {d.reperti.map((r) => {
                const peso = r.tipo === 'norma' ? 0 : r.peso;
                return (
                  <li key={r.n}>
                    <Numero r={r} />
                    <span className="doc-sintesi-titolo">{r.titolo}</span>
                    <span className="chip" style={colori(peso)}>{PESI[peso as 0 | 1 | 2 | 3].etichetta}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {testi.length > 0 && (
        <section className="doc-testi" aria-label="Cosa ha scritto il medico">
          {testi.map((c) => (
            <div key={c.chiave} className="doc-testo">
              <div className="eyebrow">{c.etichetta}</div>
              <h2>{TITOLI_PAZIENTE[c.chiave]}</h2>
              <p>{d.testi[c.chiave]}</p>
            </div>
          ))}
        </section>
      )}

      {d.reperti.length > 0 && (
        <section className="doc-reperti" aria-labelledby="t-reperti">
          <div className="sect-head">
            <h2 id="t-reperti">Dove si trovano i reperti</h2>
          </div>
          <div className="doc-grid">
            <div className="doc-tavole">
              {insieme.length > 0 && (
                <div className="part">
                  <header className="part-head">
                    <span className="part-num">1</span>
                    <div>
                      <h3>Viste d'insieme</h3>
                      
                    </div>
                  </header>
                  {insieme.map((t) => (
                    <section key={t.id} id={idTavola(t.id)} className={`plate ${t.layout}`}>
                      <header className="plate-head">
                        <h4>Tavola {numeri.get(t.id)}{t.vista ? ` · ${t.vista.replace(/^Tavola \d+ · /, '')}` : ''}</h4>
                      </header>
                      <div className="figwrap">{tavola(t)}</div>
                      {t.testo && <p className="plate-testo">{t.testo}</p>}
                    </section>
                  ))}
                </div>
              )}
              {radiologo.length > 0 && (
                <div className="part">
                  <header className="part-head">
                    <span className="part-num">{insieme.length ? 2 : 1}</span>
                    <div>
                      <h3>Le viste del radiologo</h3>
                      {/* <p>Come nelle immagini della risonanza: fette sottili sugli stessi piani, orientate come sullo schermo del medico.</p> */}
                    </div>
                  </header>
                  <div className="secs">
                    {radiologo.map((t) => (
                      <figure key={t.id} id={idTavola(t.id)}>
                        <header className="plate-head">
                          <h4>Tavola {numeri.get(t.id)} · {t.titolo}</h4>
                        </header>
                        <div className="figwrap">{tavola(t)}</div>
                        {t.testo && <figcaption className="plate-testo">{t.testo}</figcaption>}
                      </figure>
                    ))}
                  </div>
                </div>
              )}
              {insieme.length + radiologo.length === 0 && (
                <p className="empty">Nessun reperto ha una posizione sulle tavole: trovi la spiegazione nell'elenco.</p>
              )}
            </div>
            <aside className="doc-elenco" aria-label="Elenco dei reperti">
              <p className="doc-elenco-guida">
                Ogni numero sui disegni corrisponde a un reperto dell'elenco.
              </p>
              <h3 className="eyebrow">Reperti trovati</h3>
              {d.reperti.map((r) => (
                <SchedaReperto
                  key={r.n}
                  as="article"
                  r={r}
                  s={r.codice ? S[r.codice] : undefined}
                  dove={dove(r)}
                  onPointerEnter={() => setEvid(r.codice)}
                  onPointerLeave={() => setEvid(null)}
                >
                  <div className="scheda-link">
                    <a href={LINK_APPROFONDIMENTO} target="_blank" rel="noopener noreferrer">Scopri di più</a>
                    <small>Questo link è solo un esempio e non riporta alla pagina corretta.</small>
                  </div>
                </SchedaReperto>
              ))}
              <div className="legenda" aria-label="Legenda dei colori">
                {[3, 2, 1, 0].map((p) => (
                  <span key={p} style={colori(p)}><i />{PESI[p as 0 | 1 | 2 | 3].etichetta}</span>
                ))}
              </div>
            </aside>
          </div>
        </section>
      )}
    </article>
  );
}
