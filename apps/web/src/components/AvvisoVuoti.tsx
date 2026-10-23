/** Popup prima di lasciare i Testi: elenca i campi vuoti, poi si chiude o si prosegue comunque. */
import { useEffect, useRef } from 'react';
import { CAMPI_TESTO, type Diagnosi } from '@deep-anatomy/shared';

/** tutti i campi del passo 1, anche il riferimento del paziente */
export function campiVuoti(d: Diagnosi): string[] {
  return [
    ...(!d.paziente.trim() ? ['Riferimento paziente'] : []),
    ...CAMPI_TESTO.filter((c) => !d.testi[c.chiave].trim()).map((c) => c.etichetta),
  ];
}

/** `verso` è l'indirizzo dove si va proseguendo; null tiene il popup chiuso */
export function AvvisoVuoti({ vuoti, verso, onChiudi }: { vuoti: string[]; verso: string | null; onChiudi: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (verso) ref.current?.showModal();
    else ref.current?.close();
  }, [verso]);
  return (
    <dialog ref={ref} className="avviso" aria-labelledby="avviso-vuoti" onClose={onChiudi}>
      <h2 id="avviso-vuoti">{vuoti.length === 1 ? 'Un campo è vuoto' : `${vuoti.length} campi sono vuoti`}</h2>
      <ul>{vuoti.map((n) => <li key={n}>{n}</li>)}</ul>
      <p className="muted">I testi vuoti non compariranno nella pagina del paziente.</p>
      <div className="row end">
        <button type="button" className="btn" onClick={onChiudi}>Chiudi</button>
        {/* chiudendo, verso torna null e il link perde l'href: si naviga a mano prima di chiudere */}
        <a className="btn primary" href={verso ?? undefined}
          onClick={(e) => { e.preventDefault(); if (verso) { location.assign(verso); } onChiudi(); }}>Prosegui comunque →</a>
      </div>
    </dialog>
  );
}
