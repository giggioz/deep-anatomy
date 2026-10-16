/**
 * Il documento per il paziente: lo stesso nell'anteprima del medico e nella pagina da consegnare.
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
import { SchedaReperto, colori } from './SchedaReperto';

const TITOLI_PAZIENTE: Record<string, string> = {
  anamnesi: 'La tua storia',
  esame_obiettivo: 'Cosa ha trovato alla visita',
  esame_strumentale: 'Cosa mostrano gli esami',
  terapia: 'Cosa fare adesso',
};

function data(iso: string): string {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; }
}

function elencoNumeri(ns: number[]): string {
  if (ns.length === 1) return `Tavola ${ns[0]}`;
  return `Tavole ${ns.slice(0, -1).join(', ')} e ${ns[ns.length - 1]}`;
}

function conteggi(reperti: Reperto[]): { peso: number; testo: string }[] {
  const nomi: Record<number, [string, string]> = { 3: ['importante', 'importanti'], 2: ['moderato', 'moderati'], 1: ['lieve', 'lievi'], 0: ['nella norma', 'nella norma'] };
  return [3, 2, 1, 0].flatMap((p) => {
    const n = reperti.filter((r) => (r.tipo === 'norma' ? 0 : r.peso) === p).length;
    return n ? [{ peso: p, testo: `${n} ${nomi[p]![n === 1 ? 0 : 1]}` }] : [];
  });
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

  function dove(r: Reperto): string | undefined {
    if (!r.codice) return undefined;
    const ns = [...insieme, ...radiologo].filter((t) => tavolaContiene(t, r.codice!)).map((t) => numeri.get(t.id)!);
    return ns.length ? elencoNumeri(ns) : 'Non compare nelle tavole di questo documento';
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
          <p className="lede">
            Questa pagina spiega con parole semplici e con alcuni disegni la diagnosi del tuo ortopedico.
            Non sostituisce il referto: per ogni dubbio chiedi al tuo medico.
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
            <div className="doc-conti">
              {conteggi(d.reperti).map((c) => (
                <span key={c.peso} className="chip" style={colori(c.peso)}>{c.testo}</span>
              ))}
            </div>
          )}
        </section>
      )}

      {testi.length > 0 && (
        <section className="doc-testi" aria-label="Cosa ha scritto il medico">
          {testi.map((c) => (
            <div key={c.chiave} className={`doc-testo${c.chiave === 'terapia' ? ' terapia' : ''}`}>
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
            <p>
              Ogni numero sui disegni corrisponde a un reperto dell'elenco. Passa sopra o tocca un numero per leggerne
              la spiegazione. I disegni sono schematici e non in scala: servono a capire dove, non a misurare.
            </p>
          </div>
          <div className="doc-grid">
            <div className="doc-tavole">
              {insieme.length > 0 && (
                <div className="part">
                  <header className="part-head">
                    <span className="part-num">1</span>
                    <div>
                      <div className="eyebrow">Viste d'insieme</div>
                      <h3>Per capire dove si trova</h3>
                    </div>
                  </header>
                  {insieme.map((t) => (
                    <section key={t.id} className={`plate ${t.layout}`}>
                      <div className="plate-head">
                        <div>
                          <div className="eyebrow">Tavola {numeri.get(t.id)}{t.vista ? ` · ${t.vista.replace(/^Tavola \d+ · /, '')}` : ''}</div>
                          <h3>{t.titolo}</h3>
                        </div>
                        <p>{t.testo}</p>
                      </div>
                      <div className="figwrap">{tavola(t)}</div>
                    </section>
                  ))}
                </div>
              )}
              {radiologo.length > 0 && (
                <div className="part rm">
                  <header className="part-head">
                    <span className="part-num">{insieme.length ? 2 : 1}</span>
                    <div>
                      <div className="eyebrow">Le viste del radiologo</div>
                      <h3>Come nelle immagini della risonanza</h3>
                      <p>Fette sottili sugli stessi piani della risonanza, orientate come sullo schermo del medico.</p>
                    </div>
                  </header>
                  <div className="secs">
                    {radiologo.map((t) => (
                      <figure key={t.id}>
                        <div className="figwrap">{tavola(t)}</div>
                        <figcaption>
                          <span className="eyebrow">Tavola {numeri.get(t.id)}</span>
                          <b>{t.titolo}</b>
                          {t.testo}
                        </figcaption>
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
              <h3 className="eyebrow">I reperti, uno per uno</h3>
              {d.reperti.map((r) => (
                <SchedaReperto
                  key={r.n}
                  as="article"
                  r={r}
                  s={r.codice ? S[r.codice] : undefined}
                  dove={dove(r)}
                  onPointerEnter={() => setEvid(r.codice)}
                  onPointerLeave={() => setEvid(null)}
                />
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
