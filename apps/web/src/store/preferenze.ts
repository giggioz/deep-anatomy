/** Piccole comodità ricordate nel browser (il nome del medico). Se il browser non salva, si riparte da vuoto. */
import { useState } from 'react';

const MEDICO = 'deep-anatomy:medico';

function leggi(k: string): string {
  try { return localStorage.getItem(k) ?? ''; } catch { return ''; }
}
function scrivi(k: string, v: string): void {
  try { localStorage.setItem(k, v); } catch { /* niente */ }
}

export function useMedico(): [string, (v: string) => void] {
  const [v, setV] = useState(() => leggi(MEDICO));
  return [v, (x: string) => { setV(x); scrivi(MEDICO, x); }];
}
