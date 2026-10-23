/** Password dimenticata: si scrive l'email e arriva un link. La risposta è la stessa che l'account esista o no. */
import { useState, type FormEvent } from 'react';
import { chiedi } from '../store/accesso';
import { link } from '../router';
import { PaginaFuori } from '../components/PaginaFuori';

export function Recupero() {
  const [email, setEmail] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [inviata, setInviata] = useState(false);

  async function invia(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setErrore('Scrivi la tua email.');
    setInvio(true);
    const r = await chiedi('/api/auth/recupero', { email });
    setInvio(false);
    if (r.ok) setInviata(true);
    else setErrore(r.status === 400 ? 'L\'email non sembra valida.' : r.errore);
  }

  if (inviata) {
    return (
      <PaginaFuori titolo="Controlla la posta">
        <p className="muted">
          Se <b>{email.trim()}</b> corrisponde a un account, tra poco riceverai un'email con il link per scegliere
          una nuova password. Il link vale un'ora. Se non la trovi, guarda anche nella posta indesiderata.
        </p>
        <a className="btn" href={link.home}>← Torna all'accesso</a>
      </PaginaFuori>
    );
  }

  return (
    <PaginaFuori titolo="Password dimenticata" testo="Scrivi l'email del tuo account: ti mandiamo un link per sceglierne una nuova." onInvia={invia}>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="username" value={email} autoFocus
          onChange={(e) => { setEmail(e.target.value); setErrore(null); }} />
      </label>
      {errore && <p className="accesso-errore" role="alert">{errore}</p>}
      <button className="btn primary" type="submit" disabled={invio}>{invio ? 'Invio…' : 'Inviami il link'}</button>
      <a className="accesso-link" href={link.home}>← Torna all'accesso</a>
    </PaginaFuori>
  );
}
