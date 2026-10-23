/** Barra in alto: marchio, la diagnosi aperta, i tre passi (Diagnosi, Reperti, Pagina paziente) e il tuo account. */
import { useState } from 'react';
import { nomeDistretto, type Utente } from '@deep-anatomy/shared';
import { PASSI, link, type Rotta } from '../router';
import { useDiagnosi } from '../store/diagnosi';
import { AvvisoVuoti, campiVuoti } from './AvvisoVuoti';

const NOMI_PASSI: Record<(typeof PASSI)[number], string> = { diagnosi: 'Diagnosi', reperti: 'Reperti', paziente: 'Pagina paziente' };

export function Barra({ rotta, utente }: { rotta: Rotta; utente: Utente }) {
  const id = 'id' in rotta ? rotta.id : undefined;
  const d = useDiagnosi(id);
  const attivo = PASSI.indexOf(rotta.pagina as (typeof PASSI)[number]);
  const [verso, setVerso] = useState<string | null>(null);
  // stesse regole dei tasti Avanti: la pagina paziente chiede almeno un reperto, lasciare i Testi con campi vuoti apre l'avviso
  const vuoti = d && rotta.pagina === 'diagnosi' ? campiVuoti(d) : [];
  return (
    <header className="topbar">
      <div className="topbar-in">
        <a className="brand" href={link.home}>
          <b>Deep Anatomy</b>
        </a>
        {d && (
          <span className="barra-d">
            <span className="cap">{nomeDistretto(d.distretto, d.lato)}</span>
            {d.paziente && <> · {d.paziente}</>}
          </span>
        )}
        <div className="topbar-dx">
          {d && (
            <nav className="steps" aria-label="Passi">
              {PASSI.map((p, i) => {
                const classe = i === attivo ? 'on' : i < attivo ? 'done' : '';
                if (p === 'paziente' && d.reperti.length === 0) {
                  return (
                    <a key={p} className={`${classe} off`} role="link" aria-disabled="true" title="Aggiungi almeno un reperto">
                      <b>{i + 1}</b>{NOMI_PASSI[p]}
                    </a>
                  );
                }
                const href = link.passo(d.id, p);
                return (
                  <a key={p} href={href} className={classe} aria-current={i === attivo ? 'step' : undefined}
                    onClick={(e) => { if (i > attivo && vuoti.length) { e.preventDefault(); setVerso(href); } }}>
                    <b>{i + 1}</b>{NOMI_PASSI[p]}
                  </a>
                );
              })}
            </nav>
          )}
          <a className="btn small barra-utente" href={link.account} title="Account, password, esci"
            aria-current={rotta.pagina === 'account' ? 'page' : undefined}>{utente.nome || utente.email}</a>
        </div>
      </div>
      {d && <AvvisoVuoti vuoti={vuoti} verso={verso} onChiudi={() => setVerso(null)} />}
    </header>
  );
}
