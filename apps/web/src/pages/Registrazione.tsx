/**
 * Registrazione: nome, email, password. L'account nasce quando il medico apre il link di conferma arrivato per email.
 * La risposta è la stessa che l'email abbia già un account o no (in quel caso il proprietario riceve un avviso).
 */
import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN, problemaPassword } from '@deep-anatomy/shared';
import { chiedi } from '../store/accesso';
import { link } from '../router';
import { CampoPassword } from '../components/CampoPassword';
import { PaginaFuori } from '../components/PaginaFuori';

export function Registrazione() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [inviata, setInviata] = useState(false);

  async function invia(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErrore('Scrivi il tuo nome.');
    if (!email.trim()) return setErrore('Scrivi la tua email.');
    const problema = problemaPassword(password, email);
    if (problema) return setErrore(problema);
    setInvio(true);
    const r = await chiedi('/api/auth/registrazione', { nome, email, password });
    setInvio(false);
    if (r.ok) setInviata(true);
    else setErrore(r.errore === 'Richiesta non valida.' ? 'Controlla i dati: l\'email non sembra valida.' : r.errore);
  }

  if (inviata) {
    return (
      <PaginaFuori titolo="Conferma la tua email">
        <p className="muted">
          Ti abbiamo scritto a <b>{email.trim()}</b>. Apri il link nell'email per attivare l'account: vale 24 ore.
          Se non la trovi, guarda anche nella posta indesiderata.
        </p>
        <p className="muted">Finché non confermi, l'account non esiste e non puoi accedere.</p>
        <a className="btn" href={link.home}>← Torna all'accesso</a>
      </PaginaFuori>
    );
  }

  const campo = (f: (v: string) => void) => (e: { target: { value: string } }) => { f(e.target.value); setErrore(null); };
  return (
    <PaginaFuori titolo="Crea un account" testo="Per preparare le pagine che spiegano la diagnosi ai tuoi pazienti." onInvia={invia}>
      <label className="field">
        <span>Nome e cognome</span>
        <input type="text" autoComplete="name" value={nome} autoFocus onChange={campo(setNome)} />
        <small>Come vuoi comparire, per esempio "Dott.ssa Anna Rossi".</small>
      </label>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="username" value={email} onChange={campo(setEmail)} />
      </label>
      <CampoPassword etichetta="Password" completa="new-password" valore={password}
        nota={`Almeno ${PASSWORD_MIN} caratteri. Una frase di più parole è facile da ricordare e difficile da indovinare.`}
        onCambia={(v) => { setPassword(v); setErrore(null); }} />
      {errore && <p className="accesso-errore" role="alert">{errore}</p>}
      <button className="btn primary" type="submit" disabled={invio}>{invio ? 'Invio…' : 'Registrati'}</button>
      <p className="accesso-altro">Hai già un account? <a href={link.home}>Accedi</a></p>
    </PaginaFuori>
  );
}
