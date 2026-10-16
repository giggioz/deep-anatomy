/**
 * Passo 2 · i reperti, indicati toccando le tavole.
 *
 * A sinistra la tavola (viste d'insieme o viste del radiologo); a destra la ricerca, la scheda del reperto
 * e l'elenco numerato. Ogni reperto punta a un codice della libreria: è tutto ciò che serve alla pagina
 * del paziente per disegnarlo. Mentre si compila, il reperto compare già sulla tavola.
 */
import { useMemo, useState } from 'react';
import {
  FONTI, FONTI_ETICHETTE, NOMI_TIPI_STRUTTURA, ORDINE_TIPI, PESI, TIPI, TIPI_REPERTO,
  partiDi, rinumera, spiegazioneReperto, tavolaContiene, titoloProposto,
  type Diagnosi, type Fonte, type Peso, type Reperto, type TipoReperto,
} from '@deep-anatomy/shared';
import type { LibreriaPronta } from '../tavole/libreria';
import { Tavola } from '../tavole/Tavola';
import { aggiornaDiagnosi } from '../store/diagnosi';
import { link } from '../router';
import { Numero, colori } from '../components/SchedaReperto';
import { IcoCerca, IcoChiudi, IcoElimina, IcoGiu, IcoModifica, IcoSpunta, IcoSu } from '../components/Icone';

interface Bozza {
  codice: string | null;
  tipo: TipoReperto;
  peso: Peso;
  fonte: Fonte;
  titolo: string;
  /** il titolo segue struttura e tipo finché il medico non lo scrive a mano */
  titoloAuto: boolean;
  frase: string;
  spiegazione: string;
}

const PESI_SCELTA: Peso[] = [1, 2, 3];

function normalizza(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function Reperti({ d, lib }: { d: Diagnosi; lib: LibreriaPronta }) {
  const S = lib.strutture;
  const [tavolaId, setTavolaId] = useState(lib.tavole[0]?.id ?? '');
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [modifica, setModifica] = useState<number | null>(null);
  const [cerca, setCerca] = useState('');
  const [sopra, setSopra] = useState<string | null>(null);
  const [fonte, setFonte] = useState<Fonte>('rm');

  const tavola = lib.tavole.find((t) => t.id === tavolaId) ?? lib.tavole[0];
  const numTavola = (id: string) => lib.tavole.findIndex((t) => t.id === id) + 1;
  const doveSi = (codice: string) => lib.tavole.filter((t) => tavolaContiene(t, codice));

  /* il reperto in compilazione compare subito sulla tavola */
  const nBozza = modifica ?? d.reperti.length + 1;
  const daBozza = (b: Bozza, n: number): Reperto => ({
    n, codice: b.codice, tipo: b.tipo, peso: b.tipo === 'norma' ? 0 : b.peso, fonte: b.fonte,
    titolo: b.titolo.trim() || titoloProposto(b.tipo, b.codice ? S[b.codice] : undefined),
    frase: b.frase.trim(),
    ...(b.spiegazione.trim() ? { spiegazione: b.spiegazione.trim() } : {}),
  });
  const visibili = useMemo(() => {
    if (!bozza) return d.reperti;
    const b = daBozza(bozza, nBozza);
    return modifica != null ? d.reperti.map((r) => (r.n === modifica ? b : r)) : [...d.reperti, b];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.reperti, bozza, modifica]);

  function mostraSuTavola(codice: string) {
    if (tavola && tavolaContiene(tavola, codice)) return;
    const t = doveSi(codice)[0];
    if (t) setTavolaId(t.id);
  }

  function scegliStruttura(codice: string) {
    mostraSuTavola(codice);
    setBozza((b) => {
      if (!b) {
        return { codice, tipo: 'lesione', peso: 2, fonte, titolo: titoloProposto('lesione', S[codice]), titoloAuto: true, frase: '', spiegazione: '' };
      }
      return { ...b, codice, titolo: b.titoloAuto ? titoloProposto(b.tipo, S[codice]) : b.titolo };
    });
  }

  function apriReperto(n: number) {
    const r = d.reperti.find((x) => x.n === n);
    if (!r) return;
    setModifica(n);
    setBozza({
      codice: r.codice, tipo: r.tipo, peso: r.peso, fonte: r.fonte, titolo: r.titolo,
      titoloAuto: r.titolo === titoloProposto(r.tipo, r.codice ? S[r.codice] : undefined),
      frase: r.frase, spiegazione: r.spiegazione ?? '',
    });
    if (r.codice) mostraSuTavola(r.codice);
  }

  function chiudi() { setBozza(null); setModifica(null); }

  function salva(b: Bozza | null = bozza) {
    if (!b) return;
    const r = daBozza(b, nBozza);
    aggiornaDiagnosi(d.id, (x) => ({
      ...x,
      reperti: rinumera(modifica != null ? x.reperti.map((y) => (y.n === modifica ? r : y)) : [...x.reperti, r]),
    }));
    setFonte(b.fonte);
    chiudi();
  }

  function nellaNorma() {
    if (!bozza?.codice) return;
    salva({ ...bozza, tipo: 'norma', peso: 0, titolo: titoloProposto('norma', S[bozza.codice]), titoloAuto: true });
  }

  function sposta(n: number, di: -1 | 1) {
    aggiornaDiagnosi(d.id, (x) => {
      const r = [...x.reperti];
      const i = r.findIndex((y) => y.n === n), j = i + di;
      if (i < 0 || j < 0 || j >= r.length) return x;
      [r[i], r[j]] = [r[j]!, r[i]!];
      return { ...x, reperti: rinumera(r) };
    });
    if (modifica != null) chiudi();
  }

  function elimina(n: number) {
    aggiornaDiagnosi(d.id, (x) => ({ ...x, reperti: rinumera(x.reperti.filter((y) => y.n !== n)) }));
    if (modifica != null) chiudi();
  }

  function aggiorna<K extends keyof Bozza>(k: K, v: Bozza[K]) {
    setBozza((b) => {
      if (!b) return b;
      const n = { ...b, [k]: v };
      if (k === 'tipo') {
        n.peso = v === 'norma' ? 0 : b.peso === 0 ? 2 : b.peso;
        if (b.titoloAuto) n.titolo = titoloProposto(v as TipoReperto, b.codice ? S[b.codice] : undefined);
      }
      if (k === 'titolo') n.titoloAuto = false;
      return n;
    });
  }

  const risultati = useMemo(() => {
    const q = normalizza(cerca.trim());
    if (!q) return [];
    return Object.entries(S)
      .filter(([c, s]) => normalizza(`${s.n} ${c}`).includes(q))
      .sort(([, a], [, b]) => Number(!normalizza(a.n).startsWith(q)) - Number(!normalizza(b.n).startsWith(q)) || a.n.localeCompare(b.n, 'it'))
      .slice(0, 14);
  }, [cerca, S]);

  const perTipo = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const k of ORDINE_TIPI) {
      const cod = Object.keys(S).filter((c) => S[c]!.k === k).sort((a, b) => S[a]!.n.localeCompare(S[b]!.n, 'it'));
      if (cod.length) g.set(k, cod);
    }
    return g;
  }, [S]);

  const contaInTavola = (t: (typeof lib.tavole)[number]) => d.reperti.filter((r) => r.codice && tavolaContiene(t, r.codice)).length;
  const gruppi = [
    { nome: "Viste d'insieme", tavole: lib.tavole.filter((t) => t.parte !== 'radiologo') },
    { nome: 'Viste del radiologo', tavole: lib.tavole.filter((t) => t.parte === 'radiologo') },
  ].filter((g) => g.tavole.length);

  const sb = bozza?.codice ? S[bozza.codice] : undefined;
  const padre = bozza?.codice && sb?.p && sb.p !== bozza.codice && S[sb.p] ? sb.p : null;
  const parti = bozza?.codice ? partiDi(S, bozza.codice) : [];
  const evid = sopra ?? bozza?.codice ?? null;

  return (
    <main className="page">
      <div className="head">
        <div className="eyebrow">Passo 2 di 3 · Reperti</div>
        <h1>Indica i reperti sulle tavole</h1>
        <p>Tocca una struttura sulla tavola, o cercala per nome, e descrivi cosa hai trovato. Indica anche le strutture nella norma che vuoi far vedere al paziente: ricevono il loro numero, in verde.</p>
      </div>

      <div className="editor">
        <section className={`viewer${tavola?.parte === 'radiologo' ? ' rm rmwrap' : ''}`} aria-label="Tavole">
          <div className="tabs">
            {gruppi.map((g) => (
              <div className="grp" key={g.nome}>
                <span>{g.nome}</span>
                {g.tavole.map((t) => {
                  const n = contaInTavola(t);
                  return (
                    <button key={t.id} type="button" className="chip-btn" aria-pressed={t.id === tavola?.id} onClick={() => setTavolaId(t.id)}>
                      {numTavola(t.id)} · {t.titolo}{n > 0 && <span className="cnt">{n}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {tavola && (
            <>
              <Tavola
                tavola={tavola}
                strutture={S}
                reperti={visibili}
                evidenzia={evid}
                onStruttura={scegliStruttura}
                onReperto={apriReperto}
                invito={modifica != null ? 'Tocca per spostare qui il reperto' : 'Tocca per aggiungere un reperto'}
                mostraCodici
              />
              <p className="hint">{tavola.testo}</p>
            </>
          )}
        </section>

        <div className="side">
          <section className="card stack" aria-label="Cerca una struttura">
            <label className="field">
              <span className="row" style={{ gap: 6 }}><IcoCerca size={16} /> Cerca una struttura</span>
              <input type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder={lib.distretto === 'spalla' ? 'Es. sovraspinato, labbro, borsa' : 'Es. menisco, crociato, condilo'} />
            </label>
            {risultati.length > 0 && (
              <div className="search-res">
                {risultati.map(([c, s]) => (
                  <button key={c} type="button" onClick={() => { scegliStruttura(c); setCerca(''); }}>
                    <span>{s.n}</span>
                    <small>{doveSi(c).map((t) => `T${numTavola(t.id)}`).join(' ')}</small>
                  </button>
                ))}
              </div>
            )}
            {cerca.trim() && risultati.length === 0 && <p className="muted" style={{ fontSize: 14 }}>Nessuna struttura con questo nome nella libreria.</p>}
            <details className="tutte">
              <summary>Tutte le strutture ({Object.keys(S).length})</summary>
              {[...perTipo].map(([k, cod]) => (
                <div key={k} className="tutte-g">
                  <b>{NOMI_TIPI_STRUTTURA[k as keyof typeof NOMI_TIPI_STRUTTURA]}</b>
                  <div className="tutte-l">
                    {cod.map((c) => (
                      <button key={c} type="button" className="chip-btn" onClick={() => scegliStruttura(c)}
                        onPointerEnter={() => setSopra(c)} onPointerLeave={() => setSopra(null)}>
                        {S[c]!.n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </details>
          </section>

          {bozza && (
            <section className="card stack scheda-form" aria-label={modifica != null ? `Reperto ${modifica}` : 'Nuovo reperto'} style={colori(bozza.tipo === 'norma' ? 0 : bozza.peso)}>
              <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>
                  <Numero r={{ n: nBozza, peso: bozza.peso, tipo: bozza.tipo }} />
                  <div className="form-title">
                    <b>{sb?.n ?? 'Reperto senza posizione'}</b>
                    {sb ? <span className="muted" style={{ fontSize: 14 }}>{sb.d}</span>
                      : <span className="note" style={{ marginTop: 6 }}>Tocca una struttura sulla tavola per collocare questo reperto.</span>}
                    {bozza.codice && <code>{bozza.codice}</code>}
                  </div>
                </div>
                <button type="button" className="icon-btn" aria-label="Chiudi" onClick={chiudi}><IcoChiudi size={18} /></button>
              </div>

              {padre && (
                <div className="row" style={{ gap: 8 }}>
                  <small className="muted">È una parte di {S[padre]!.n.toLowerCase()}.</small>
                  <button type="button" className="btn small" onClick={() => scegliStruttura(padre)}>Indica tutto: {S[padre]!.n}</button>
                </div>
              )}
              {parti.length > 0 && (
                <div className="row" style={{ gap: 6 }}>
                  <small className="muted">Oppure solo una parte:</small>
                  {parti.map((p) => <button key={p} type="button" className="chip-btn" onClick={() => scegliStruttura(p)}>{S[p]!.n.split(' · ')[1] ?? S[p]!.n}</button>)}
                </div>
              )}

              {bozza.codice && modifica == null && (
                <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }} onClick={nellaNorma}>
                  <IcoSpunta size={16} /> Nella norma, aggiungi subito
                </button>
              )}

              <div className="field">
                <span style={{ fontWeight: 600 }}>Cosa hai trovato</span>
                <div className="seg">
                  {TIPI_REPERTO.map((t) => (
                    <button key={t} type="button" aria-pressed={bozza.tipo === t} onClick={() => aggiorna('tipo', t)}>{TIPI[t].etichetta}</button>
                  ))}
                </div>
              </div>
              {bozza.tipo !== 'norma' && (
                <div className="field">
                  <span style={{ fontWeight: 600 }}>Quanto conta</span>
                  <div className="seg sev">
                    {PESI_SCELTA.map((p) => (
                      <button key={p} type="button" aria-pressed={bozza.peso === p} style={colori(p)} onClick={() => aggiorna('peso', p)}>{PESI[p].etichetta}</button>
                    ))}
                  </div>
                  <small className="muted" style={{ fontSize: 13 }}>Decide il colore sulle tavole. È una lettura per il paziente, non una classificazione clinica.</small>
                </div>
              )}
              <label className="field">
                <span>Da dove viene</span>
                <select value={bozza.fonte} onChange={(e) => aggiorna('fonte', e.target.value as Fonte)}>
                  {FONTI.map((f) => <option key={f} value={f}>{FONTI_ETICHETTE[f]}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Titolo</span>
                <input type="text" value={bozza.titolo} onChange={(e) => aggiorna('titolo', e.target.value)} />
              </label>
              <label className="field">
                <span>La tua frase</span>
                <small>Come la scrivi tu o come è scritta nel referto. Il paziente la vede tra virgolette.</small>
                <textarea rows={2} value={bozza.frase} onChange={(e) => aggiorna('frase', e.target.value)} />
              </label>
              <label className="field">
                <span>Spiegazione per il paziente</span>
                <small>Se la lasci vuota si usa quella standard, qui sotto in grigio.</small>
                <textarea rows={3} value={bozza.spiegazione} placeholder={spiegazioneReperto({ tipo: bozza.tipo }, sb)}
                  onChange={(e) => aggiorna('spiegazione', e.target.value)} />
              </label>
              <div className="row between">
                {modifica != null
                  ? <button type="button" className="btn danger" onClick={() => elimina(modifica)}><IcoElimina size={16} /> Elimina</button>
                  : <span />}
                <div className="row">
                  <button type="button" className="btn" onClick={chiudi}>Annulla</button>
                  <button type="button" className="btn primary" onClick={() => salva()}>
                    {modifica != null ? `Salva reperto ${modifica}` : `Aggiungi reperto ${nBozza}`}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="card stack" aria-labelledby="t-elenco">
            <div className="row between">
              <h2 id="t-elenco" className="eyebrow">Reperti · {d.reperti.length}</h2>
            </div>
            {d.reperti.length === 0 ? (
              <p className="empty">Tocca una struttura sulla tavola, o cercala qui sopra, per aggiungere il primo reperto.</p>
            ) : (
              <div className="rep-list">
                {d.reperti.map((r, i) => (
                  <div key={r.n} className={`rep${modifica === r.n ? ' sel' : ''}`}
                    onPointerEnter={() => setSopra(r.codice)} onPointerLeave={() => setSopra(null)}>
                    <Numero r={r} />
                    <button type="button" className="rep-txt" onClick={() => apriReperto(r.n)}>
                      <b>{r.titolo}</b>
                      <small>
                        {r.codice ? S[r.codice]?.n ?? r.codice : <span className="warn">Senza posizione sulle tavole</span>}
                        {' · '}{TIPI[r.tipo].etichetta} · {FONTI_ETICHETTE[r.fonte]}
                      </small>
                    </button>
                    <div className="acts">
                      <button type="button" className="icon-btn" aria-label="Sposta su" disabled={i === 0} onClick={() => sposta(r.n, -1)}><IcoSu size={16} /></button>
                      <button type="button" className="icon-btn" aria-label="Sposta giù" disabled={i === d.reperti.length - 1} onClick={() => sposta(r.n, 1)}><IcoGiu size={16} /></button>
                      <button type="button" className="icon-btn" aria-label="Modifica" onClick={() => apriReperto(r.n)}><IcoModifica size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="row between">
            <a className="btn" href={link.passo(d.id, 'testi')}>← Testi</a>
            <a className="btn primary" href={link.passo(d.id, 'anteprima')}>Avanti: anteprima →</a>
          </div>
        </div>
      </div>
    </main>
  );
}
