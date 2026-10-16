/**
 * Una Tavola Anatomica interattiva.
 *
 * L'SVG arriva già pronto dalla libreria e viene inserito così com'è; React gestisce solo i reperti
 * (overlay.ts), l'evidenziazione delle strutture e il popup. Le strutture sono <g class="st" data-id data-p>,
 * le etichette <g class="lb" data-for>, i reperti si disegnano in <g class="ov">.
 *
 * - editor: un tocco su una struttura (o sulla sua etichetta) chiama onStruttura; un tocco su un numero chiama onReperto.
 * - paziente: il passaggio o il tocco mostrano il nome della struttura o la scheda del reperto.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Reperto, Struttura, Tavola as TTavola } from '@deep-anatomy/shared';
import { applica, membri } from './overlay';
import { SchedaReperto } from '../components/SchedaReperto';

interface Props {
  tavola: TTavola;
  strutture: Record<string, Struttura>;
  reperti: Reperto[];
  /** struttura da tenere accesa (la struttura scelta nell'editor, o il reperto sotto il puntatore nell'elenco) */
  evidenzia?: string | null;
  onStruttura?: (codice: string) => void;
  onReperto?: (n: number) => void;
  /** testo in fondo al popup di una struttura, es. "Tocca per aggiungere un reperto" */
  invito?: string;
  /** mostra il codice tecnico nel popup (solo lato medico) */
  mostraCodici?: boolean;
  className?: string;
}

type Popup =
  | { k: 'st'; codice: string; x: number; y: number; fisso: boolean }
  | { k: 'rep'; n: number; x: number; y: number; fisso: boolean };

export function Tavola({ tavola, strutture, reperti, evidenzia = null, onStruttura, onReperto, invito, mostraCodici, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const sotto = useRef<string | null>(null);
  const base = useRef<string | null>(evidenzia);
  base.current = evidenzia;

  const accendi = useCallback((codice: string | null) => {
    const root = box.current;
    if (!root) return;
    root.classList.toggle('focus', codice != null);
    root.querySelectorAll('.on').forEach((e) => e.classList.remove('on'));
    if (codice == null) return;
    const ms = membri(root, codice);
    ms.forEach((e) => e.classList.add('on'));
    const ids = new Set(ms.map((m) => (m as HTMLElement).dataset.id));
    root.querySelectorAll<SVGGElement>('.lb').forEach((l) => { if (ids.has(l.dataset.for)) l.classList.add('on'); });
  }, []);

  // 1) l'SVG: si inserisce quando cambia la tavola
  useLayoutEffect(() => {
    const root = box.current;
    if (!root) return;
    root.innerHTML = tavola.svg;
    root.querySelectorAll<SVGGElement>('.st').forEach((g) => {
      const id = g.dataset.id ?? '';
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', strutture[id]?.n ?? id);
    });
    const svg = root.querySelector('svg');
    svg?.setAttribute('aria-label', tavola.titolo);
  }, [tavola.svg, tavola.titolo, strutture]);

  // 2) i reperti: si ridisegnano quando cambiano
  const chiave = reperti.map((r) => `${r.n}:${r.codice}:${r.tipo}:${r.peso}`).join('|');
  useLayoutEffect(() => {
    const svg = box.current?.querySelector('svg');
    if (!svg) return;
    applica(svg, tavola, reperti);
    svg.querySelectorAll<SVGGElement>('.ov .bub').forEach((b) => {
      const r = reperti.find((x) => String(x.n) === b.dataset.n);
      if (r) b.setAttribute('aria-label', `Reperto ${r.n}: ${r.titolo}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave, tavola, strutture]);

  // 3) evidenziazione dall'esterno
  useEffect(() => { if (sotto.current == null) accendi(evidenzia); }, [evidenzia, accendi, tavola.svg]);

  // posizione del popup: dopo il render, quando se ne conoscono le dimensioni
  useLayoutEffect(() => {
    const t = tip.current;
    if (!t || !popup) return;
    const w = t.offsetWidth, h = t.offsetHeight;
    let left = popup.x + 16, top = popup.y + 16;
    if (left + w > innerWidth - 8) left = popup.x - w - 16;
    if (top + h > innerHeight - 8) top = popup.y - h - 16;
    t.style.left = `${Math.max(8, left)}px`;
    t.style.top = `${Math.max(8, top)}px`;
  }, [popup]);

  // un popup fissato si chiude toccando altrove o con Esc
  useEffect(() => {
    if (!popup?.fisso) return;
    const fuori = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) { setPopup(null); sotto.current = null; accendi(base.current); }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPopup(null); sotto.current = null; accendi(base.current); } };
    document.addEventListener('pointerdown', fuori);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fuori); document.removeEventListener('keydown', esc); };
  }, [popup?.fisso, accendi]);

  function bersaglio(t: EventTarget | null): { k: 'rep'; n: number; codice: string } | { k: 'st'; codice: string } | null {
    const el = t instanceof Element ? t : null;
    const b = el?.closest<SVGGElement>('.bub');
    if (b) return { k: 'rep', n: Number(b.dataset.n), codice: b.dataset.codice ?? '' };
    const s = el?.closest<SVGGElement>('.st');
    if (s?.dataset.id) return { k: 'st', codice: s.dataset.id };
    const l = el?.closest<SVGGElement>('.lb');
    if (l?.dataset.for) return { k: 'st', codice: l.dataset.for };
    return null;
  }

  function muovi(e: React.PointerEvent) {
    if (e.pointerType === 'touch' || popup?.fisso) return;
    const b = bersaglio(e.target);
    if (!b) {
      if (sotto.current != null) { sotto.current = null; accendi(base.current); setPopup(null); }
      return;
    }
    if (sotto.current !== b.codice) { sotto.current = b.codice; accendi(b.codice); }
    setPopup(b.k === 'rep' ? { k: 'rep', n: b.n, x: e.clientX, y: e.clientY, fisso: false } : { k: 'st', codice: b.codice, x: e.clientX, y: e.clientY, fisso: false });
  }

  function esci() {
    if (popup?.fisso) return;
    sotto.current = null;
    accendi(base.current);
    setPopup(null);
  }

  function scegli(t: EventTarget | null, x: number, y: number, tocco: boolean) {
    const b = bersaglio(t);
    if (!b) { setPopup(null); sotto.current = null; accendi(base.current); return; }
    if (b.k === 'rep') {
      if (onReperto) { onReperto(b.n); setPopup(null); return; }
      const gia = popup?.k === 'rep' && popup.n === b.n && popup.fisso;
      sotto.current = gia ? null : b.codice;
      accendi(gia ? base.current : b.codice);
      setPopup(gia ? null : { k: 'rep', n: b.n, x, y, fisso: true });
      return;
    }
    if (onStruttura) { onStruttura(b.codice); if (tocco) setPopup(null); return; }
    const gia = popup?.k === 'st' && popup.codice === b.codice && popup.fisso;
    sotto.current = gia ? null : b.codice;
    accendi(gia ? base.current : b.codice);
    setPopup(gia ? null : { k: 'st', codice: b.codice, x, y, fisso: true });
  }

  function tasto(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const r = (e.target as Element).getBoundingClientRect?.();
    if (!r) return;
    e.preventDefault();
    scegli(e.target, r.right, r.bottom, false);
  }

  function fuoco(e: React.FocusEvent) {
    const b = bersaglio(e.target);
    if (!b) return;
    const r = (e.target as Element).getBoundingClientRect();
    sotto.current = b.codice;
    accendi(b.codice);
    setPopup(b.k === 'rep' ? { k: 'rep', n: b.n, x: r.right, y: r.bottom, fisso: false } : { k: 'st', codice: b.codice, x: r.right, y: r.bottom, fisso: false });
  }

  let contenuto: ReactNode = null;
  if (popup?.k === 'st') {
    const s = strutture[popup.codice];
    contenuto = (
      <>
        <b>{s?.n ?? popup.codice}</b>
        {mostraCodici && <code>{popup.codice}</code>}
        {s?.d && <span className="tip-d">{s.d}</span>}
        {invito && <span className="tip-inv">{invito}</span>}
      </>
    );
  } else if (popup?.k === 'rep') {
    const r = reperti.find((x) => x.n === popup.n);
    if (r) contenuto = <SchedaReperto r={r} s={r.codice ? strutture[r.codice] : undefined} mostraCodice={mostraCodici} />;
  }

  return (
    <>
      <div
        ref={box}
        className={`tavola ${className ?? ''}`}
        onPointerMove={muovi}
        onPointerLeave={esci}
        onClick={(e) => scegli(e.target, e.clientX, e.clientY, (e.nativeEvent as PointerEvent).pointerType === 'touch')}
        onKeyDown={tasto}
        onFocus={fuoco}
        onBlur={esci}
      />
      {popup && contenuto && (
        <div ref={tip} className={`tip ${popup.k === 'rep' ? 'fnd' : ''}`} role="tooltip">
          {contenuto}
        </div>
      )}
    </>
  );
}
