/** Cornice delle pagine senza accesso (entra, recupero, scelta della password): una scheda al centro e il piè di pagina. */
import type { FormEvent, ReactNode } from 'react';
import { PieDiPagina } from './PieDiPagina';

type Props = { titolo: string; testo?: ReactNode; onInvia?: (e: FormEvent) => void; children: ReactNode };

export function PaginaFuori({ titolo, testo, onInvia, children }: Props) {
  const corpo = (
    <>
      <div className="head">
        <span className="eyebrow">Alpha version {__VERSIONE__}</span>
        <h1>{titolo}</h1>
        {testo && <p>{testo}</p>}
      </div>
      {children}
    </>
  );
  return (
    <main className="accesso">
      {onInvia
        ? <form className="card accesso-card stack" onSubmit={onInvia} noValidate>{corpo}</form>
        : <div className="card accesso-card stack">{corpo}</div>}
      <PieDiPagina />
    </main>
  );
}
