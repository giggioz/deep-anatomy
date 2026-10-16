/** Icone a tratto, 20px, colore del testo. */
import type { ReactNode, SVGProps } from 'react';

function Ico({ children, size = 20, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}>
      {children}
    </svg>
  );
}

export const IcoCrea = (p: { size?: number }) => (
  <Ico {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Ico>
);
export const IcoImporta = (p: { size?: number }) => (
  <Ico {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M12 11v6m-3-3 3 3 3-3" /></Ico>
);
export const IcoSu = (p: { size?: number }) => <Ico {...p}><path d="m6 15 6-6 6 6" /></Ico>;
export const IcoGiu = (p: { size?: number }) => <Ico {...p}><path d="m6 9 6 6 6-6" /></Ico>;
export const IcoModifica = (p: { size?: number }) => (
  <Ico {...p}><path d="M4 20h4L18.5 9.5l-4-4L4 16v4Z" /></Ico>
);
export const IcoElimina = (p: { size?: number }) => (
  <Ico {...p}><path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Ico>
);
export const IcoStampa = (p: { size?: number }) => (
  <Ico {...p}><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></Ico>
);
export const IcoIndietro = (p: { size?: number }) => <Ico {...p}><path d="M15 6 9 12l6 6" /></Ico>;
export const IcoAvanti = (p: { size?: number }) => <Ico {...p}><path d="m9 6 6 6-6 6" /></Ico>;
export const IcoCerca = (p: { size?: number }) => <Ico {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></Ico>;
export const IcoSpunta = (p: { size?: number }) => <Ico {...p}><path d="m5 12 4.5 4.5L19 7" /></Ico>;
export const IcoChiudi = (p: { size?: number }) => <Ico {...p}><path d="M6 6l12 12M18 6 6 18" /></Ico>;
export const IcoFile = (p: { size?: number }) => (
  <Ico {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></Ico>
);
