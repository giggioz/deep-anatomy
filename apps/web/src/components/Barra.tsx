/** Barra in alto: marchio, la diagnosi aperta e i tre passi (Testi, Reperti, Anteprima). */
import { nomeDistretto } from '@deep-anatomy/shared';
import { PASSI, link, type Rotta } from '../router';
import { useDiagnosi } from '../store/diagnosi';

const NOMI_PASSI: Record<(typeof PASSI)[number], string> = { testi: 'Testi', reperti: 'Reperti', anteprima: 'Anteprima' };

export function Barra({ rotta }: { rotta: Rotta }) {
  const id = 'id' in rotta ? rotta.id : undefined;
  const d = useDiagnosi(id);
  const attivo = PASSI.indexOf(rotta.pagina as (typeof PASSI)[number]);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <a className="brand" href={link.home}>
          <b>Deep Anatomy</b>
          <small>demo</small>
        </a>
        {d && (
          <span className="barra-d">
            <span className="cap">{nomeDistretto(d.distretto, d.lato)}</span>
            {d.paziente && <> · {d.paziente}</>}
            {d.stato === 'approvata' && <span className="pill ok">Approvata</span>}
          </span>
        )}
        {d ? (
          <nav className="steps" aria-label="Passi">
            {PASSI.map((p, i) => (
              <a key={p} href={link.passo(d.id, p)} className={i === attivo ? 'on' : i < attivo ? 'done' : ''} aria-current={i === attivo ? 'step' : undefined}>
                <b>{i + 1}</b>{NOMI_PASSI[p]}
              </a>
            ))}
          </nav>
        ) : (
          <span className="demo-tag" title="Usa solo dati inventati">Solo dati inventati</span>
        )}
      </div>
    </header>
  );
}
