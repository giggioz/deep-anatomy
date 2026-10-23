/** Link di conferma dell'email: il server crea l'account e apre la sessione, poi si va all'app. */
import { useEffect, useState } from 'react';
import { chiedi, entrato, type Esito } from '../store/accesso';
import { link, vai } from '../router';
import { PaginaFuori } from '../components/PaginaFuori';

// il link vale una volta sola: una richiesta per gettone, anche se React esegue l'effetto due volte (StrictMode)
const richieste = new Map<string, Promise<Esito<unknown>>>();

export function Conferma({ gettone }: { gettone: string }) {
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!gettone) { setErrore('Il link è incompleto. Copialo per intero dall\'email.'); return; }
    let p = richieste.get(gettone);
    if (!p) richieste.set(gettone, (p = chiedi('/api/auth/conferma', { gettone })));
    let vivo = true;
    void p.then((r) => {
      if (!vivo) return;
      if (!r.ok) return setErrore(r.errore);
      entrato(r.dati);
      vai(link.home);
    });
    return () => { vivo = false; };
  }, [gettone]);

  if (!errore) return <PaginaFuori titolo="Un momento…"><p className="muted">Confermo il tuo account.</p></PaginaFuori>;
  return (
    <PaginaFuori titolo="Conferma non riuscita" testo={errore}>
      <a className="btn primary" href={link.home}>Vai all'accesso</a>
      <p className="accesso-altro">Il link è scaduto? <a href={link.registrazione}>Registrati di nuovo</a></p>
    </PaginaFuori>
  );
}
