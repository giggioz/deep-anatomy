/**
 * Accesso dei medici: le richieste e le risposte di /api/auth/*, condivise tra web app e server.
 *
 * Registrazione libera: nome, email e password. L'account nasce solo quando il medico apre il link di conferma
 * arrivato per email. Un link dello stesso tipo serve per recuperare la password.
 */
import { z } from 'zod';

/** Lunghezza minima: niente regole su maiuscole e simboli, conta la lunghezza (linee guida NIST). */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

export const Email = z.string().trim().toLowerCase().email().max(254);
export const NuovaPassword = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

export const RichiestaAccesso = z.object({ email: Email, password: z.string().min(1).max(PASSWORD_MAX) });
export const RichiestaRegistrazione = z.object({ nome: z.string().trim().min(1).max(100), email: Email, password: NuovaPassword });
export const RichiestaRecupero = z.object({ email: Email });
/** il gettone arriva dal link dell'email */
export const RichiestaConferma = z.object({ gettone: z.string().min(20).max(200) });
export const RichiestaReimposta = z.object({ gettone: z.string().min(20).max(200), password: NuovaPassword });
export const RichiestaCambiaPassword = z.object({ attuale: z.string().min(1).max(PASSWORD_MAX), nuova: NuovaPassword });

/** amministratore: vede #/admin (vedi admin.ts) */
export const Utente = z.object({ email: z.string(), nome: z.string(), amministratore: z.boolean().optional() });
export const RispostaUtente = z.object({ utente: Utente });
/** GET /api/auth/gettone?t=…: il link di recupero è ancora valido? per quale account? */
export const RispostaGettone = z.object({ email: z.string() });

export type Utente = z.infer<typeof Utente>;
export type RispostaUtente = z.infer<typeof RispostaUtente>;
export type RispostaGettone = z.infer<typeof RispostaGettone>;

/** Messaggio per una password nuova non valida, o null se va bene. */
export function problemaPassword(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN) return `La password deve avere almeno ${PASSWORD_MIN} caratteri.`;
  if (password.length > PASSWORD_MAX) return `La password può avere al massimo ${PASSWORD_MAX} caratteri.`;
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) return 'La password non può essere uguale all\'email.';
  return null;
}

/**
 * Account di prova dello sviluppo locale: npm run db lo crea se manca, la pagina di accesso lo precompila.
 * Solo in sviluppo (import.meta.env.DEV): la build di produzione non lo contiene.
 */
export const ACCOUNT_PROVA = { email: 'prova@esempio.it', password: 'password-di-prova-1', nome: 'Dott. Prova' } as const;
