/**
 * Importa diagnosi: un modello linguistico legge il referto (testo, foto o PDF) e precompila lo stesso modulo
 * di Crea diagnosi. Il medico controlla tutto prima che arrivi al paziente.
 * Senza chiave sul server funzionano i referti di esempio, con il risultato già pronto.
 */
import { useEffect, useRef, useState } from 'react';
import { RispostaImporta, rinumera, type Distretto, type Lato, type RichiestaImporta } from '@deep-anatomy/shared';
import { SceltaDistretto } from '../components/SceltaDistretto';
import { IcoFile, IcoChiudi } from '../components/Icone';
import { ESEMPI, esempioPerTesto, type Esempio } from '../esempi/esempi';
import { creaDiagnosi } from '../store/diagnosi';
import { useMedico } from '../store/preferenze';
import { useIndice } from '../tavole/libreria';
import { link, vai } from '../router';

type TipoFile = NonNullable<RichiestaImporta['file']>['tipo'];
const TIPI_FILE: TipoFile[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_MB = 10;

interface Salute { ai: boolean; modello?: string }

function leggiFile(f: File): Promise<string> {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => ko(r.error ?? new Error('Lettura del file non riuscita'));
    r.readAsDataURL(f);
  });
}

export function Importa() {
  const indice = useIndice();
  const [medico] = useMedico();
  const [distretto, setDistretto] = useState<Distretto>('ginocchio');
  const [lato, setLato] = useState<Lato>('destro');
  const [testo, setTesto] = useState('');
  const [file, setFile] = useState<{ nome: string; dati: string; tipo: TipoFile } | null>(null);
  const [capito, setCapito] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [sopra, setSopra] = useState(false);
  const [salute, setSalute] = useState<Salute | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/salute')
      .then((r) => (r.ok ? (r.json() as Promise<Salute>) : { ai: false }))
      .catch(() => ({ ai: false }))
      .then((s) => vivo && setSalute(s));
    return () => { vivo = false; };
  }, []);

  async function scegliFile(f: File | undefined) {
    setErrore(null);
    if (!f) return;
    if (!TIPI_FILE.includes(f.type as TipoFile)) { setErrore('Formato non supportato: usa JPG, PNG, WEBP, GIF o PDF.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setErrore(`Il file supera ${MAX_MB} MB.`); return; }
    try {
      setFile({ nome: f.name, dati: await leggiFile(f), tipo: f.type as TipoFile });
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    }
  }

  function usaEsempio(e: Esempio) {
    setDistretto(e.distretto);
    setLato(e.lato);
    setTesto(e.testo);
    setFile(null);
    setErrore(null);
  }

  function apri(r: RispostaImporta) {
    const d = creaDiagnosi({
      distretto, lato, paziente: '', medico, origine: 'importata',
      testi: r.testi, reperti: rinumera(r.reperti), da_controllare: r.non_mappati,
    });
    vai(link.passo(d.id, 'testi'));
  }

  async function interpreta() {
    setErrore(null);
    setInvio(true);
    const esempio = !file ? esempioPerTesto(testo) : undefined;
    const usaPronto = esempio && esempio.distretto === distretto && esempio.lato === lato;
    try {
      if (usaPronto && !salute?.ai) { apri(esempio.risultato); return; }
      const corpo: RichiestaImporta = { distretto, lato, ...(testo.trim() ? { testo } : {}), ...(file ? { file: { dati: file.dati, tipo: file.tipo } } : {}) };
      const r = await fetch('/api/importa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
      const j: unknown = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (usaPronto) { apri(esempio.risultato); return; }
        const msg = (j as { errore?: string }).errore;
        throw new Error(msg ?? `Il server ha risposto ${r.status}.`);
      }
      const ok = RispostaImporta.safeParse(j);
      if (!ok.success) throw new Error('La risposta del server non ha il formato atteso.');
      apri(ok.data);
    } catch (e) {
      if (usaPronto) { apri(esempio.risultato); return; }
      setErrore(e instanceof TypeError ? 'Il server non risponde. È avviato? (npm run dev)' : e instanceof Error ? e.message : String(e));
    } finally {
      setInvio(false);
    }
  }

  const pronto = (testo.trim().length > 0 || file != null) && capito && !invio;

  return (
    <main className="page narrow">
      <div className="head">
        <a href={link.home} className="eyebrow" style={{ textDecoration: 'none' }}>← Deep Anatomy</a>
        <h1>Importa diagnosi</h1>
        <p>Incolla il referto o carica una foto o un PDF. L'intelligenza artificiale divide il testo nei cinque campi e trova i reperti sulle tavole; poi controlli e correggi tu, come in Crea diagnosi.</p>
      </div>

      <div className="note">
        <b>Solo per la demo</b>
        Usa referti inventati o completamente anonimizzati. Per essere interpretati, il testo o il file vengono inviati a un
        servizio di intelligenza artificiale esterno. Il risultato è una proposta: la controlli tu, campo per campo, prima che arrivi al paziente.
      </div>

      <section className="card stack" aria-labelledby="t-esempi">
        <h2 id="t-esempi" className="eyebrow">Prova con un referto di esempio</h2>
        <div className="examples">
          {ESEMPI.map((e) => (
            <button key={e.id} type="button" className="example" onClick={() => usaEsempio(e)}>
              <b>{e.titolo}</b>
              <small>{e.descrizione}</small>
              <small className="mono">{e.distretto} {e.lato} · inventato</small>
            </button>
          ))}
        </div>
        {salute && !salute.ai && (
          <p className="muted" style={{ fontSize: 14 }}>Il server non ha la chiave del modello linguistico: con gli esempi si usa il risultato già pronto; gli altri referti non si possono interpretare.</p>
        )}
      </section>

      <section className="card stack">
        <SceltaDistretto distretto={distretto} lato={lato} onDistretto={setDistretto} onLato={setLato} indice={indice} />
        <label className="field">
          <span>Testo del referto</span>
          <textarea rows={10} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Incolla qui il referto della visita o della risonanza…" />
        </label>
        <div
          className={`drop${sopra ? ' over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setSopra(true); }}
          onDragLeave={() => setSopra(false)}
          onDrop={(e) => { e.preventDefault(); setSopra(false); void scegliFile(e.dataTransfer.files[0]); }}
        >
          {file ? (
            <div className="row" style={{ justifyContent: 'center' }}>
              <IcoFile size={18} /><span>{file.nome}</span>
              <button type="button" className="icon-btn" aria-label="Togli il file" onClick={() => setFile(null)}><IcoChiudi size={16} /></button>
            </div>
          ) : (
            <>
              <p>Oppure trascina qui una foto o un PDF del referto</p>
              <button type="button" className="btn small" style={{ marginTop: 10 }} onClick={() => input.current?.click()}>Scegli un file</button>
              <input ref={input} type="file" accept={TIPI_FILE.join(',')} hidden onChange={(e) => void scegliFile(e.target.files?.[0])} />
            </>
          )}
        </div>
        <label className="row" style={{ gap: 10, alignItems: 'flex-start', fontSize: 14.5 }}>
          <input type="checkbox" checked={capito} onChange={(e) => setCapito(e.target.checked)} style={{ marginTop: 4 }} />
          <span>Il referto è inventato o anonimizzato: non contiene nomi, date di nascita o altri dati del paziente.</span>
        </label>
        {errore && <p className="note" role="alert"><b>Non è stato possibile importare</b>{errore}</p>}
        <div className="row end">
          <a className="btn" href={link.home}>Annulla</a>
          <button type="button" className="btn primary" disabled={!pronto} onClick={() => void interpreta()}>
            {invio ? <><span className="spinner" aria-hidden="true" /> Interpreto il referto…</> : 'Interpreta e precompila →'}
          </button>
        </div>
      </section>
    </main>
  );
}
