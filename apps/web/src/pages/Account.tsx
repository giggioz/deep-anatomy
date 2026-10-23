/** Il tuo account: chi sei, cambio password, uscita. */
import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN, problemaPassword, type Utente } from '@deep-anatomy/shared';
import { chiedi, entrato, esci } from '../store/accesso';
import { CampoPassword } from '../components/CampoPassword';

export function Account({ utente }: { utente: Utente }) {
  const [attuale, setAttuale] = useState('');
  const [nuova, setNuova] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);
  const [invio, setInvio] = useState(false);

  async function cambia(e: FormEvent) {
    e.preventDefault();
    setFatto(false);
    if (!attuale) return setErrore('Scrivi la password attuale.');
    const problema = problemaPassword(nuova, utente.email);
    if (problema) return setErrore(problema);
    setInvio(true);
    const r = await chiedi('/api/auth/password', { attuale, nuova });
    setInvio(false);
    if (!r.ok) return setErrore(r.errore);
    entrato(r.dati);
    setAttuale('');
    setNuova('');
    setFatto(true);
  }

  return (
    <main className="page narrow">
      <div className="head">
        <span className="eyebrow">Account</span>
        <h1>{utente.nome || utente.email}</h1>
        {utente.nome && <p>{utente.email}</p>}
      </div>

      <form className="card stack account-card" onSubmit={cambia} noValidate>
        <h2>Cambia password</h2>
        <input type="email" autoComplete="username" value={utente.email} readOnly hidden />
        <CampoPassword etichetta="Password attuale" completa="current-password" valore={attuale}
          onCambia={(v) => { setAttuale(v); setErrore(null); }} />
        <CampoPassword etichetta="Nuova password" completa="new-password" valore={nuova}
          nota={`Almeno ${PASSWORD_MIN} caratteri. Gli altri dispositivi dovranno rientrare.`}
          onCambia={(v) => { setNuova(v); setErrore(null); setFatto(false); }} />
        {errore && <p className="accesso-errore" role="alert">{errore}</p>}
        {fatto && <p className="accesso-ok" role="status">Password cambiata. Ti abbiamo mandato un'email di conferma.</p>}
        <div><button className="btn primary" type="submit" disabled={invio}>{invio ? 'Salvo…' : 'Cambia password'}</button></div>
      </form>

      <div className="card stack account-card">
        <h2>Esci</h2>
        <p className="muted">
          Le diagnosi restano salvate in questo browser anche dopo l'uscita. Su un computer condiviso, eliminale prima di uscire.
        </p>
        <div><button className="btn" type="button" onClick={() => void esci()}>Esci da Deep Anatomy</button></div>
      </div>
    </main>
  );
}
