/**
 * Accende i reperti su una tavola a partire dai soli codici (porting di overlay.js della skill).
 *
 * Un codice padre (es. "menisco-mediale") accende anche le sue parti (data-p). Se un codice non compare
 * nella tavola, la tavola resta pulita: nessun disegno inventato.
 */
import type { Reperto, Tavola } from '@deep-anatomy/shared';

const NS = 'http://www.w3.org/2000/svg';
export const COLORE_PESO: Record<number, string> = { 3: 'var(--s3)', 2: 'var(--s2)', 1: 'var(--s1)', 0: 'var(--ok)' };
export const SFONDO_PESO: Record<number, string> = { 3: 'var(--s3-soft)', 2: 'var(--s2-soft)', 1: 'var(--s1-soft)', 0: 'var(--ok-soft)' };
const INCHIOSTRO: Record<number, string> = { 3: '#fff', 2: '#fff', 1: '#241b00', 0: '#fff' };

type Marcabile = Pick<Reperto, 'n' | 'codice' | 'tipo' | 'peso'>;

function el(tag: string, attrs: Record<string, string | number>, parent: Element, text?: string): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (text != null) e.textContent = text;
  parent.appendChild(e);
  return e;
}

export function membri(svg: Element, codice: string): Element[] {
  const c = CSS.escape(codice);
  return [...svg.querySelectorAll(`.st[data-id="${c}"],.st[data-p="${c}"]`)];
}

export function ancora(tavola: Pick<Tavola, 'anchors'>, codice: string): [number, number] | null {
  const a = tavola.anchors ?? {};
  if (a[codice]) return a[codice];
  const k = Object.keys(a).find((x) => x.startsWith(codice + '-'));
  return k ? (a[k] ?? null) : null;
}

export function pulisci(svg: Element): void {
  const ov = svg.querySelector('.ov');
  if (ov) ov.innerHTML = '';
}

/** Disegna i reperti; restituisce i numeri dei reperti che in questa tavola non hanno trovato posto. */
export function applica(svg: SVGSVGElement, tavola: Tavola, reperti: Marcabile[]): number[] {
  const ov = svg.querySelector('.ov');
  if (!ov) return reperti.map((r) => r.n);
  ov.innerHTML = '';
  const assenti: number[] = [];
  // la larghezza della tavola intera, anche quando sul telefono è inquadrato solo il disegno (Tavola.tsx)
  const larghezza = svg.dataset.vb ? Number(svg.dataset.vb.split(/[\s,]+/)[2]) : svg.viewBox.baseVal.width;
  const piccola = tavola.layout === 'sec' || larghezza < 520;
  const marcati: Marcabile[] = [];
  for (const f of reperti) {
    if (!f.codice) { assenti.push(f.n); continue; }
    const ms = membri(svg, f.codice);
    if (!ms.length) { assenti.push(f.n); continue; }
    const col = COLORE_PESO[f.peso] ?? COLORE_PESO[2]!;
    for (const m of ms) {
      const d = m.querySelector('path')?.getAttribute('d');
      if (!d) continue;
      if (f.tipo === 'lesione') {
        el('path', { d, class: 'les', fill: col, stroke: col }, ov);
        el('path', { d, class: 'les2 pulse', stroke: col }, ov);
      } else if (f.tipo === 'usura') {
        el('path', { d, class: 'usu', fill: col, stroke: col }, ov);
      } else if (f.tipo === 'edema') {
        el('path', { d, class: 'ede pulse' }, ov);
      } else if (f.tipo === 'versamento') {
        el('path', { d, class: 'flu pulse' }, ov);
      }
    }
    marcati.push(f);
  }
  // i numeri dopo tutte le forme, così un versamento non copre il numero di un altro reperto
  for (const f of marcati) {
    const a = ancora(tavola, f.codice!);
    if (!a) continue;
    const g = el('g', { class: 'bub', 'data-n': f.n, 'data-codice': f.codice!, tabindex: 0, role: 'button' }, ov);
    const r = piccola ? 11 : 13;
    const c = f.tipo === 'norma' ? COLORE_PESO[0]! : (COLORE_PESO[f.peso] ?? COLORE_PESO[2]!);
    el('circle', { cx: a[0], cy: a[1], r, fill: c }, g);
    el('text', { x: a[0], y: a[1] + 0.5, fill: f.tipo === 'norma' ? '#fff' : (INCHIOSTRO[f.peso] ?? '#fff'), 'font-size': r < 12 ? 11 : 13 }, g, String(f.n));
  }
  return assenti;
}
