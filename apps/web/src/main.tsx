import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import defs from './tavole/defs.svg?raw';
import { App } from './App';
import './tavole/materiali.css';
import './styles/app.css';
import './styles/paziente.css';

/* gradienti, retini e filtri delle tavole: una volta sola per pagina, li usano tutti gli SVG */
function Definizioni() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: defs }} />
  );
}

// /admin (senza #): in produzione lo reindirizza il server, in sviluppo ci pensiamo qui
if (window.location.pathname.replace(/\/+$/, '') === '/admin') history.replaceState(null, '', '/#/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Definizioni />
    <App />
  </StrictMode>,
);
