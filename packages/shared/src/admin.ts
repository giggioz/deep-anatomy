/**
 * Amministrazione: l'elenco degli account (GET /api/admin/account) e i conteggi d'uso (POST /api/attivita).
 *
 * Le diagnosi restano nel browser del medico: al server arrivano solo i conteggi (creata, approvata) con il distretto
 * e l'origine. Niente testi, niente paziente.
 */
import { z } from 'zod';
import { Distretto } from './schema.js';

/** L'unico account che vede #/admin. Il server lo controlla su ogni richiesta /api/admin/*. */
export const AMMINISTRATORE = 'giggioz@gmail.com';

export const RichiestaAttivita = z.object({
  tipo: z.enum(['creata', 'approvata']),
  distretto: Distretto,
  origine: z.enum(['creata', 'importata']),
});

export const RigaAccount = z.object({
  email: z.string(),
  nome: z.string(),
  attivo: z.boolean(),
  /** ISO; null se mai */
  bloccatoFino: z.string().nullable(),
  creato: z.string(),
  ultimoAccesso: z.string().nullable(),
  ultimaAttivita: z.string().nullable(),
  sessioni: z.number(),
  diagnosi: z.number(),
  importate: z.number(),
  approvate: z.number(),
  importazioni: z.number(),
  distretti: z.record(z.string(), z.number()),
});

export const RispostaAdmin = z.object({
  account: z.array(RigaAccount),
  /** registrazioni non ancora confermate (gettone valido) */
  inAttesa: z.array(z.object({ email: z.string(), nome: z.string(), scade: z.string() })),
});

export type RichiestaAttivita = z.infer<typeof RichiestaAttivita>;
export type RigaAccount = z.infer<typeof RigaAccount>;
export type RispostaAdmin = z.infer<typeof RispostaAdmin>;
