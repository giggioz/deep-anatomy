/**
 * Amministrazione: tutti gli account con date e conteggi d'uso, e le registrazioni in attesa di conferma.
 * Solo per AMMINISTRATORE: App nasconde la pagina agli altri, il server risponde 403 comunque.
 * I conteggi partono dal rilascio di questa pagina: le diagnosi create prima non sono contate.
 */
import { useEffect, useMemo, useState } from 'react';
import { DISTRETTI_INFO, RispostaAdmin, type Distretto, type RigaAccount } from '@deep-anatomy/shared';
import { chiedi } from '../store/accesso';

const GIORNO = 24 * 60 * 60 * 1000;

function data(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
}

/** "oggi 14:32", "ieri", "5 giorni fa", poi la data */
function relativa(iso: string | null): string {
  if (!iso) return 'mai';
  const d = new Date(iso);
  const giorni = Math.floor((new Date().setHours(24, 0, 0, 0) - d.getTime()) / GIORNO);
  if (giorni <= 0) return `oggi ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
  if (giorni === 1) return 'ieri';
  if (giorni < 30) return `${giorni} giorni fa`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** l'ultima volta che si è fatto vivo: richiesta con la sessione o accesso con password */
const ultimaVolta = (a: RigaAccount) => [a.ultimaAttivita, a.ultimoAccesso].filter(Boolean).sort().at(-1) ?? null;

type Colonna = { chiave: string; titolo: string; valore: (a: RigaAccount) => string | number; num?: boolean };
const COLONNE: Colonna[] = [
  { chiave: 'medico', titolo: 'Medico', valore: (a) => (a.nome || a.email).toLowerCase() },
  { chiave: 'stato', titolo: 'Stato', valore: (a) => stato(a).testo },
  { chiave: 'creato', titolo: 'Creato', valore: (a) => a.creato },
  { chiave: 'accesso', titolo: 'Ultimo accesso', valore: (a) => a.ultimoAccesso ?? '' },
  { chiave: 'attivita', titolo: 'Ultima attività', valore: (a) => ultimaVolta(a) ?? '' },
  { chiave: 'sessioni', titolo: 'Sessioni', valore: (a) => a.sessioni, num: true },
  { chiave: 'diagnosi', titolo: 'Diagnosi', valore: (a) => a.diagnosi, num: true },
  { chiave: 'importate', titolo: 'Importate', valore: (a) => a.importate, num: true },
  { chiave: 'approvate', titolo: 'Approvazioni', valore: (a) => a.approvate, num: true },
  { chiave: 'importazioni', titolo: 'Chiamate AI', valore: (a) => a.importazioni, num: true },
  { chiave: 'distretti', titolo: 'Distretti', valore: (a) => Object.keys(a.distretti).sort().join(' ') },
];

function stato(a: RigaAccount): { testo: string; classe: string } {
  if (!a.attivo) return { testo: 'disattivato', classe: 'off' };
  if (a.bloccatoFino) return { testo: 'bloccato', classe: 'warn' };
  return { testo: 'attivo', classe: 'ok' };
}

export function Admin() {
  const [dati, setDati] = useState<RispostaAdmin | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [ordine, setOrdine] = useState<{ chiave: string; su: boolean }>({ chiave: 'creato', su: false });
  const [cerca, setCerca] = useState('');

  async function carica() {
    setErrore(null);
    const r = await chiedi('/api/admin/account');
    if (!r.ok) return setErrore(r.errore);
    const p = RispostaAdmin.safeParse(r.dati);
    if (p.success) setDati(p.data);
    else setErrore('Risposta del server non valida.');
  }
  useEffect(() => { void carica(); }, []);

  const righe = useMemo(() => {
    if (!dati) return [];
    const c = COLONNE.find((x) => x.chiave === ordine.chiave)!;
    const q = cerca.trim().toLowerCase();
    return dati.account
      .filter((a) => !q || a.email.includes(q) || a.nome.toLowerCase().includes(q))
      .sort((a, b) => {
        const x = c.valore(a), y = c.valore(b);
        const n = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return ordine.su ? n : -n;
      });
  }, [dati, ordine, cerca]);

  const totali = useMemo(() => {
    const a = dati?.account ?? [];
    const settimana = new Date(Date.now() - 7 * GIORNO).toISOString();
    const somma = (f: (x: RigaAccount) => number) => a.reduce((s, x) => s + f(x), 0);
    return [
      { etichetta: 'Account', valore: a.length },
      { etichetta: 'Attivi negli ultimi 7 giorni', valore: a.filter((x) => (ultimaVolta(x) ?? '') > settimana).length },
      { etichetta: 'Diagnosi create', valore: somma((x) => x.diagnosi) },
      { etichetta: 'Approvazioni', valore: somma((x) => x.approvate) },
      { etichetta: 'Chiamate AI', valore: somma((x) => x.importazioni) },
      { etichetta: 'In attesa di conferma', valore: dati?.inAttesa.length ?? 0 },
    ];
  }, [dati]);

  function ordina(chiave: string) {
    // al primo clic: testo dalla A alla Z, numeri e date dal più grande
    setOrdine((o) => (o.chiave === chiave ? { chiave, su: !o.su } : { chiave, su: ['medico', 'stato', 'distretti'].includes(chiave) }));
  }

  return (
    <main className="page">
      <div className="head">
        <span className="eyebrow">Amministrazione</span>
        <h1>Account</h1>
        <p>
          Le diagnosi restano nel browser dei medici: qui ci sono solo i conteggi, dal giorno in cui sono stati introdotti.
          Per disattivare un account: <code className="mono">npm run utenti -- disattiva &lt;email&gt;</code> sul server.
        </p>
      </div>

      {errore && <p className="accesso-errore" role="alert">{errore} <button className="btn small" onClick={() => void carica()}>Riprova</button></p>}
      {!dati && !errore && <p className="muted">Carico gli account…</p>}

      {dati && (
        <>
          <div className="admin-totali">
            {totali.map((t) => (
              <div key={t.etichetta} className="card admin-totale"><b>{t.valore}</b><span>{t.etichetta}</span></div>
            ))}
          </div>

          <div className="admin-strumenti">
            <input type="search" placeholder="Cerca per nome o email" value={cerca} onChange={(e) => setCerca(e.target.value)}
              aria-label="Cerca per nome o email" />
            <button className="btn small" type="button" onClick={() => void carica()}>Aggiorna</button>
          </div>

          <div className="card admin-tabella">
            <table>
              <thead>
                <tr>
                  {COLONNE.map((c) => (
                    <th key={c.chiave} className={c.num ? 'num' : undefined}
                      aria-sort={ordine.chiave === c.chiave ? (ordine.su ? 'ascending' : 'descending') : undefined}>
                      <button type="button" onClick={() => ordina(c.chiave)}>
                        {c.titolo}{ordine.chiave === c.chiave && <span aria-hidden="true">{ordine.su ? ' ↑' : ' ↓'}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righe.map((a) => {
                  const s = stato(a);
                  const ultima = ultimaVolta(a);
                  return (
                    <tr key={a.email}>
                      <td><b>{a.nome || '—'}</b><br /><a href={`mailto:${a.email}`}>{a.email}</a></td>
                      <td><span className={`admin-stato ${s.classe}`} title={a.bloccatoFino ? `fino a ${data(a.bloccatoFino)}` : undefined}>{s.testo}</span></td>
                      <td title={data(a.creato)}>{relativa(a.creato)}</td>
                      <td title={data(a.ultimoAccesso)}>{relativa(a.ultimoAccesso)}</td>
                      <td title={data(ultima)}>{relativa(ultima)}</td>
                      <td className="num">{a.sessioni}</td>
                      <td className="num">{a.diagnosi}</td>
                      <td className="num">{a.importate}</td>
                      <td className="num">{a.approvate}</td>
                      <td className="num">{a.importazioni}</td>
                      <td className="admin-distretti">
                        {Object.entries(a.distretti).sort((x, y) => y[1] - x[1])
                          .map(([k, n]) => `${DISTRETTI_INFO[k as Distretto]?.nome ?? k} ${n}`).join(' · ') || '—'}
                      </td>
                    </tr>
                  );
                })}
                {!righe.length && <tr><td colSpan={COLONNE.length} className="muted">Nessun account.</td></tr>}
              </tbody>
            </table>
          </div>

          {dati.inAttesa.length > 0 && (
            <div className="card stack admin-attesa-card">
              <h2>In attesa di conferma dell'email</h2>
              <ul className="admin-attesa">
                {dati.inAttesa.map((g) => (
                  <li key={g.email}><b>{g.nome}</b> · {g.email} <span className="muted">· il link scade {data(g.scade)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
