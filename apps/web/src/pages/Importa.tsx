/**
 * Importa diagnosi: un modello linguistico legge il referto (testo, foto o PDF) e precompila lo stesso modulo
 * di Crea diagnosi. Il medico controlla tutto prima che arrivi al paziente.
 * Senza chiave sul server funzionano i referti di esempio, con il risultato già pronto: un clic sull'esempio apre la diagnosi.
 * Con la chiave l'esempio precompila il modulo, così si prova il modello sullo stesso referto.
 */
import { useEffect, useRef, useState } from 'react';
import { RispostaImporta, nomeDistretto, rinumera, type Distretto, type Lato, type RichiestaImporta } from '@deep-anatomy/shared';
import { SceltaDistretto } from '../components/SceltaDistretto';
import { IcoFile, IcoChiudi } from '../components/Icone';
import { ESEMPI, esempioPerTesto, type Esempio } from '../esempi/esempi';
import { creaDiagnosi } from '../store/diagnosi';
import { useIndice } from '../tavole/libreria';
import { link, vai } from '../router';
import { api, useUtente } from '../store/accesso';

type TipoFile = NonNullable<RichiestaImporta['file']>['tipo'];
const TIPI_FILE: TipoFile[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_MB = 10;

interface Salute {
  ai: boolean;
  modello?: string;
}

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
  const utente = useUtente();
  const [distretto, setDistretto] = useState<Distretto>('ginocchio');
  const [lato, setLato] = useState<Lato>('destro');
  const [testo, setTesto] = useState('');
  const [file, setFile] = useState<{ nome: string; dati: string; tipo: TipoFile } | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [sopra, setSopra] = useState(false);
  const [salute, setSalute] = useState<Salute | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    api('/api/salute')
      .then((r) => (r.ok ? (r.json() as Promise<Salute>) : { ai: false }))
      .catch(() => ({ ai: false }))
      .then((s) => vivo && setSalute(s));
    return () => {
      vivo = false;
    };
  }, []);

  async function scegliFile(f: File | undefined) {
    setErrore(null);
    if (!f) return;
    if (!TIPI_FILE.includes(f.type as TipoFile)) {
      setErrore('Formato non supportato: usa JPG, PNG, WEBP, GIF o PDF.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErrore(`Il file supera ${MAX_MB} MB.`);
      return;
    }
    try {
      setFile({ nome: f.name, dati: await leggiFile(f), tipo: f.type as TipoFile });
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    }
  }

  function usaEsempio(e: Esempio) {
    // senza modello non c'è niente da interpretare: si apre subito il risultato pronto
    if (salute && !salute.ai) return apri(e.risultato, e);
    setDistretto(e.distretto);
    setLato(e.lato);
    setTesto(e.testo);
    setFile(null);
    setErrore(null);
  }

  function apri(r: RispostaImporta, dove: { distretto: Distretto; lato: Lato } = { distretto, lato }) {
    const d = creaDiagnosi({
      ...dove,
      paziente: '',
      medico: utente.nome,
      origine: 'importata',
      testi: r.testi,
      reperti: rinumera(r.reperti),
      da_controllare: r.non_mappati,
    });
    vai(link.passo(d.id, 'diagnosi'));
  }

  async function interpreta() {
    setErrore(null);
    setInvio(true);
    const esempio = !file ? esempioPerTesto(testo) : undefined;
    const usaPronto = esempio && esempio.distretto === distretto && esempio.lato === lato;
    try {
      if (usaPronto && !salute?.ai) {
        apri(esempio.risultato);
        return;
      }
      const corpo: RichiestaImporta = { distretto, lato, ...(testo.trim() ? { testo } : {}), ...(file ? { file: { dati: file.dati, tipo: file.tipo } } : {}) };
      const r = await api('/api/importa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
      const j: unknown = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (usaPronto) {
          apri(esempio.risultato);
          return;
        }
        if (r.status === 503 && !salute?.ai) {
          throw new Error(esempio
            ? `Questo referto di esempio è per ${nomeDistretto(esempio.distretto, esempio.lato)}: rimetti distretto e lato, oppure clicca direttamente l'esempio qui sopra.`
            : 'Nella demo si possono usare solo i referti di esempio, senza modificarne il testo: clicca un esempio qui sopra.');
        }
        const msg = (j as { errore?: string }).errore;
        throw new Error(msg ?? `Il server ha risposto ${r.status}.`);
      }
      const ok = RispostaImporta.safeParse(j);
      if (!ok.success) throw new Error('La risposta del server non ha il formato atteso.');
      apri(ok.data);
    } catch (e) {
      if (usaPronto) {
        apri(esempio.risultato);
        return;
      }
      setErrore(e instanceof TypeError ? 'Il server non risponde. È avviato? (npm run dev)' : e instanceof Error ? e.message : String(e));
    } finally {
      setInvio(false);
    }
  }

  const pronto = (testo.trim().length > 0 || file != null) && !invio;

  return (
    <main className='page narrow'>
      <div className='head'>
        <a href={link.home} className='eyebrow' style={{ textDecoration: 'none' }}>
          ← Deep Anatomy
        </a>
        <h1>Importa diagnosi</h1>
        <ul>
          <li>Incolla il referto o carica una foto o un PDF.</li>
          <li>L'intelligenza artificiale estrae le informazioni e le mette in un modulo.</li>
          <li style={{ color: 'var(--s3)' }}>Per la versione demo è possibile importare solo referti di esempio.</li>
        </ul>
      </div>

      <section className='card stack' aria-labelledby='t-esempi'>
        <h2 id='t-esempi' className='eyebrow'>
          Referti di esempio
        </h2>
        <div className='examples'>
          {ESEMPI.map((e) => (
            <button key={e.id} type='button' className='example' onClick={() => usaEsempio(e)}>
              <b>{e.titolo}</b>
              <small>{e.descrizione}</small>
              <small className='mono'>
                <span style={{ fontWeight: 500, marginRight: 5 }}>{e.distretto}</span> &nbsp;
                <span style={{ fontWeight: 500, marginRight: 5 }}>{e.lato}</span>
              </small>
            </button>
          ))}
        </div>
        {/* {salute && !salute.ai && (
          <p className="muted" style={{ fontSize: 14 }}>Il server non ha la chiave del modello linguistico: con gli esempi si usa il risultato già pronto; gli altri referti non si possono interpretare.</p>
        )} */}
      </section>

      <p className='oppure'>oppure</p>

      <section className='card stack' aria-labelledby='t-importa'>
        <h2 id='t-importa' className='eyebrow'>
          Importa un referto
        </h2>
        <SceltaDistretto distretto={distretto} lato={lato} onDistretto={setDistretto} onLato={setLato} indice={indice} />
        <label className='field'>
          <span>Testo del referto</span>
          <textarea rows={10} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder='Incolla qui il referto della visita o della risonanza…' />
        </label>
        <div
          className={`drop${sopra ? ' over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setSopra(true);
          }}
          onDragLeave={() => setSopra(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSopra(false);
            void scegliFile(e.dataTransfer.files[0]);
          }}
        >
          {file ? (
            <div className='row' style={{ justifyContent: 'center' }}>
              <IcoFile size={18} />
              <span>{file.nome}</span>
              <button type='button' className='icon-btn' aria-label='Togli il file' onClick={() => setFile(null)}>
                <IcoChiudi size={16} />
              </button>
            </div>
          ) : (
            <>
              <p>Oppure trascina qui una foto o un PDF del referto</p>
              <button type='button' className='btn small' style={{ marginTop: 10 }} onClick={() => input.current?.click()}>
                Scegli un file
              </button>
              <input ref={input} type='file' accept={TIPI_FILE.join(',')} hidden onChange={(e) => void scegliFile(e.target.files?.[0])} />
            </>
          )}
        </div>
        {errore && (
          <p className='note' role='alert'>
            <b>Non è stato possibile importare</b>
            {errore}
          </p>
        )}
        <div className='row end'>
          <a className='btn' href={link.home}>
            Annulla
          </a>
          <button type='button' className='btn primary' disabled={!pronto} onClick={() => void interpreta()}>
            {invio ? (
              <>
                <span className='spinner' aria-hidden='true' /> Interpreto il referto…
              </>
            ) : (
              'Interpreta e precompila →'
            )}
          </button>
        </div>
      </section>
    </main>
  );
}
