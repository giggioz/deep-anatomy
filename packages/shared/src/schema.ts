/**
 * Il contratto dei dati di Deep Anatomy, condiviso tra web app e server.
 *
 * Una Diagnosi è ciò che il medico compila (o che "Importa" precompila): cinque testi liberi e un elenco
 * di reperti strutturati. Ogni reperto punta a una struttura della libreria tramite il suo codice: è così
 * che la pagina del paziente sa dove disegnarlo, senza generare nulla.
 */
import { z } from 'zod';

export const DISTRETTI = ['ginocchio', 'spalla'] as const;
export const LATI = ['destro', 'sinistro'] as const;
export const TIPI_REPERTO = ['lesione', 'usura', 'edema', 'versamento', 'norma'] as const;
export const FONTI = ['esame-clinico', 'rm', 'ecografia', 'rx', 'tc', 'altro'] as const;

export const Distretto = z.enum(DISTRETTI);
export const Lato = z.enum(LATI);
export const TipoReperto = z.enum(TIPI_REPERTO);
export const Fonte = z.enum(FONTI);
/** 3 importante, 2 moderato, 1 lieve, 0 nella norma. È una lettura divulgativa, non una classificazione clinica. */
export const Peso = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const Testi = z.object({
  diagnosi: z.string(),
  anamnesi: z.string(),
  esame_obiettivo: z.string(),
  esame_strumentale: z.string(),
  terapia: z.string(),
});

export const Reperto = z.object({
  /** numero mostrato sulle tavole: segue l'ordine dell'elenco, anche per i reperti nella norma */
  n: z.number().int().positive(),
  /** codice di una struttura della libreria, oppure null se il reperto non ha una posizione (es. da Importa) */
  codice: z.string().nullable(),
  tipo: TipoReperto,
  peso: Peso,
  fonte: Fonte,
  /** titolo breve, es. "Lesione del corno posteriore del menisco mediale" */
  titolo: z.string(),
  /** la frase del medico o del referto, così come è scritta */
  frase: z.string(),
  /** spiegazione semplice scritta dal medico; se vuota si usa quella standard (spiegazioni.ts) */
  spiegazione: z.string().optional(),
});

export const StatoDiagnosi = z.enum(['bozza', 'approvata']);

export const Diagnosi = z.object({
  id: z.string(),
  creata: z.string(),
  aggiornata: z.string(),
  origine: z.enum(['creata', 'importata']),
  distretto: Distretto,
  lato: Lato,
  /** come il medico vuole riconoscere il paziente nell'elenco: iniziali, un riferimento interno. Niente dati sensibili nella demo. */
  paziente: z.string(),
  medico: z.string(),
  testi: Testi,
  reperti: z.array(Reperto),
  stato: StatoDiagnosi,
  /** frasi che Importa non ha saputo trasformare in reperti: il medico le controlla e poi le chiude */
  da_controllare: z.array(z.object({ frase: z.string(), motivo: z.string() })).optional(),
});

export type Distretto = z.infer<typeof Distretto>;
export type Lato = z.infer<typeof Lato>;
export type TipoReperto = z.infer<typeof TipoReperto>;
export type Fonte = z.infer<typeof Fonte>;
export type Peso = z.infer<typeof Peso>;
export type Testi = z.infer<typeof Testi>;
export type Reperto = z.infer<typeof Reperto>;
export type Diagnosi = z.infer<typeof Diagnosi>;

export const TESTI_VUOTI: Testi = { diagnosi: '', anamnesi: '', esame_obiettivo: '', esame_strumentale: '', terapia: '' };

export const CAMPI_TESTO: { chiave: keyof Testi; etichetta: string; aiuto: string }[] = [
  { chiave: 'diagnosi', etichetta: 'Diagnosi', aiuto: 'La conclusione della visita, come la scriveresti nel referto.' },
  { chiave: 'anamnesi', etichetta: 'Anamnesi', aiuto: 'La storia del problema: quando è iniziato, come, cosa peggiora o migliora.' },
  { chiave: 'esame_obiettivo', etichetta: 'Esame obiettivo', aiuto: 'Cosa hai trovato visitando: test, mobilità, gonfiore, dolore.' },
  { chiave: 'esame_strumentale', etichetta: 'Esame strumentale', aiuto: 'RM, ecografia, radiografie: cosa riportano e cosa ne pensi.' },
  { chiave: 'terapia', etichetta: 'Terapia', aiuto: 'Cosa fare adesso: farmaci, fisioterapia, riposo, controlli, eventuale intervento.' },
];

/** Richiesta e risposta di POST /api/importa */
export const RichiestaImporta = z.object({
  distretto: Distretto,
  lato: Lato,
  testo: z.string().optional(),
  /** foto o scansione del referto, in base64 senza prefisso data: */
  file: z.object({ dati: z.string(), tipo: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']) }).optional(),
});

export const RepertoImportato = Reperto.omit({ n: true, spiegazione: true });

export const RispostaImporta = z.object({
  testi: Testi,
  reperti: z.array(RepertoImportato),
  /** frasi del referto che descrivono un reperto ma non corrispondono a nessuna struttura della libreria */
  non_mappati: z.array(z.object({ frase: z.string(), motivo: z.string() })),
  modello: z.string(),
});

export type RichiestaImporta = z.infer<typeof RichiestaImporta>;
export type RepertoImportato = z.infer<typeof RepertoImportato>;
export type RispostaImporta = z.infer<typeof RispostaImporta>;

/** Rinumera i reperti nell'ordine dell'elenco. */
export function rinumera(reperti: Omit<Reperto, 'n'>[] | Reperto[]): Reperto[] {
  return reperti.map((r, i) => ({ ...r, n: i + 1 }) as Reperto);
}
