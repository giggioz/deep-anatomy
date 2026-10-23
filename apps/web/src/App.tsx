import type { ReactNode } from 'react';
import { useRotta, link, type Rotta } from './router';
import { useDiagnosi } from './store/diagnosi';
import { useLibreria } from './tavole/libreria';
import { Barra } from './components/Barra';
import { Home } from './pages/Home';
import { Nuova } from './pages/Nuova';
import { Importa } from './pages/Importa';
import { Testi } from './pages/Testi';
import { Reperti } from './pages/Reperti';
import { Paziente } from './pages/Paziente';
import { Accesso } from './pages/Accesso';
import { Registrazione } from './pages/Registrazione';
import { Conferma } from './pages/Conferma';
import { Recupero } from './pages/Recupero';
import { ImpostaPassword } from './pages/ImpostaPassword';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { PieDiPagina } from './components/PieDiPagina';
import { useAccesso } from './store/accesso';

function Messaggio({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <main className="page narrow">
      <div className="head"><h1>{titolo}</h1><p>{children}</p></div>
      <div><a className="btn" href={link.home}>← Torna all'inizio</a></div>
    </main>
  );
}

function PaginaDiagnosi({ rotta }: { rotta: Extract<Rotta, { id: string }> }) {
  const d = useDiagnosi(rotta.id);
  const lib = useLibreria(d?.distretto, d?.lato);
  if (!d) return <Messaggio titolo="Diagnosi non trovata">Forse è stata eliminata, o è salvata in un altro browser.</Messaggio>;
  if (rotta.pagina === 'diagnosi') return <Testi d={d} />;
  if (lib.stato === 'carica') return <main className="page"><p className="muted">Carico le tavole…</p></main>;
  if (lib.stato === 'errore') return <Messaggio titolo="Tavole non disponibili">{lib.errore}</Messaggio>;
  switch (rotta.pagina) {
    case 'reperti': return <Reperti key={d.id} d={d} lib={lib.dati} />;
    case 'paziente': return <Paziente d={d} lib={lib.dati} />;
  }
}

export function App() {
  const rotta = useRotta();
  const accesso = useAccesso();
  // i link delle email valgono anche da dentro: chi sceglie la password nuova la sceglie e basta
  if (rotta.pagina === 'password') return <ImpostaPassword gettone={rotta.gettone} />;
  if (rotta.pagina === 'conferma') return <Conferma gettone={rotta.gettone} />;
  if (accesso.stato === 'carica') return null;
  if (accesso.stato === 'fuori') {
    if (rotta.pagina === 'registrazione') return <Registrazione />;
    if (rotta.pagina === 'recupero') return <Recupero />;
    return <Accesso />;
  }
  let pagina: ReactNode;
  switch (rotta.pagina) {
    case 'home': case 'registrazione': case 'recupero': pagina = <Home />; break;
    case 'account': pagina = <Account utente={accesso.utente} />; break;
    case 'admin': pagina = accesso.utente.amministratore
      ? <Admin />
      : <Messaggio titolo="Pagina non trovata">L'indirizzo non corrisponde a nessuna pagina.</Messaggio>; break;
    case 'nuova': pagina = <Nuova />; break;
    case 'importa': pagina = <Importa />; break;
    case 'sconosciuta': pagina = <Messaggio titolo="Pagina non trovata">L'indirizzo non corrisponde a nessuna pagina.</Messaggio>; break;
    default: pagina = <PaginaDiagnosi rotta={rotta} />;
  }
  return (
    <>
      <Barra rotta={rotta} utente={accesso.utente} />
      {pagina}
      <PieDiPagina />
    </>
  );
}
