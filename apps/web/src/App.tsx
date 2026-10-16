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
import { Anteprima } from './pages/Anteprima';
import { Paziente } from './pages/Paziente';

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
  if (rotta.pagina === 'testi') return <Testi d={d} />;
  if (lib.stato === 'carica') return <main className="page"><p className="muted">Carico le tavole…</p></main>;
  if (lib.stato === 'errore') return <Messaggio titolo="Tavole non disponibili">{lib.errore}</Messaggio>;
  switch (rotta.pagina) {
    case 'reperti': return <Reperti key={d.id} d={d} lib={lib.dati} />;
    case 'anteprima': return <Anteprima d={d} lib={lib.dati} />;
    case 'paziente': return <Paziente d={d} lib={lib.dati} />;
  }
}

export function App() {
  const rotta = useRotta();
  if (rotta.pagina === 'paziente') return <PaginaDiagnosi rotta={rotta} />;
  let pagina: ReactNode;
  switch (rotta.pagina) {
    case 'home': pagina = <Home />; break;
    case 'nuova': pagina = <Nuova />; break;
    case 'importa': pagina = <Importa />; break;
    case 'sconosciuta': pagina = <Messaggio titolo="Pagina non trovata">L'indirizzo non corrisponde a nessuna pagina.</Messaggio>; break;
    default: pagina = <PaginaDiagnosi rotta={rotta} />;
  }
  return (
    <>
      <Barra rotta={rotta} />
      {pagina}
    </>
  );
}
