/** Pagina iniziale di accesso: email e password, verificate dal server. */
import { useState, type FormEvent } from 'react';
import { ACCOUNT_PROVA } from '@deep-anatomy/shared';
import { entra } from '../store/accesso';
import { link } from '../router';
import { CampoPassword } from '../components/CampoPassword';
import { PaginaFuori } from '../components/PaginaFuori';

// in sviluppo il modulo parte già compilato con l'account di prova
const INIZIALE = import.meta.env.DEV ? ACCOUNT_PROVA : { email: '', password: '' };

export function Accesso() {
  const [email, setEmail] = useState<string>(INIZIALE.email);
  const [password, setPassword] = useState<string>(INIZIALE.password);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function invia(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setErrore('Scrivi email e password.');
    setInvio(true);
    setErrore(await entra(email, password));
    setInvio(false);
  }

  return (
    <PaginaFuori titolo="Deep Anatomy" testo="Aiuta i tuoi pazienti a comprendere la loro diagnosi." onInvia={invia}>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="username" value={email} autoFocus
          onChange={(e) => { setEmail(e.target.value); setErrore(null); }} />
      </label>
      <CampoPassword etichetta="Password" completa="current-password" valore={password}
        onCambia={(v) => { setPassword(v); setErrore(null); }} />
      {errore && <p className="accesso-errore" role="alert">{errore}</p>}
      <button className="btn primary" type="submit" disabled={invio}>{invio ? 'Accesso…' : 'Accedi'}</button>
      <a className="accesso-link" href={link.recupero}>Password dimenticata?</a>
      <p className="accesso-altro">Non hai un account? <a href={link.registrazione}>Registrati</a></p>
    </PaginaFuori>
  );
}
