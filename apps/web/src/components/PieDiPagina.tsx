/** Piè di pagina dell'app: anno corrente, versione, diritti e contatti. Non compare in stampa. */
import { IcoChat, IcoMail, IcoTelefono } from './Icone';

const EMAIL = 'giggioz@gmail.com';
const TELEFONO = '+39 338 42 91451';
const NUMERO = '393384291451'; // senza + né spazi, per tel: e WhatsApp

export function PieDiPagina() {
  const anno = new Date().getFullYear();
  return (
    <footer className="piede no-print">
      <div className="piede-in">
        <p>© {anno} Deep Anatomy <span className="piede-versione">v{__VERSIONE__}</span> · Tutti i diritti riservati · Luigi Lescarini · Full stack developer & Consultant</p>
        <nav className="piede-contatti" aria-label="Contatti">
          <a href={`mailto:${EMAIL}`}><IcoMail size={16} /> {EMAIL}</a>
          <a href={`tel:+${NUMERO}`}><IcoTelefono size={16} /> {TELEFONO}</a>
          <a href={`https://wa.me/${NUMERO}`} target="_blank" rel="noopener noreferrer"><IcoChat size={16} /> WhatsApp</a>
        </nav>
      </div>
    </footer>
  );
}
