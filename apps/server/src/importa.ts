/**
 * Importa diagnosi: dal referto (testo, foto o PDF) ai cinque testi e ai reperti con codice.
 *
 * Il modello vede l'elenco delle strutture della libreria del distretto e può scegliere solo quei codici
 * (enum nello schema di uscita). Copia le frasi del medico senza riscriverle e non inventa reperti:
 * ciò che non sa collocare va in "non_mappati", che il medico controlla.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import {
  FONTI, FONTI_ETICHETTE, RispostaImporta, TIPI_REPERTO,
  fileLibreria, nomeDistretto, registroCompleto,
  type Distretto, type Lato, type Libreria, type RichiestaImporta, type Struttura,
} from '@deep-anatomy/shared';

const LIBRERIE = new URL('../../web/public/librerie/', import.meta.url);

export class ErroreImporta extends Error {
  constructor(public status: number, messaggio: string) { super(messaggio); }
}

export const modello = (): string => process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-5-5';
export const aiDisponibile = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

const cache = new Map<string, Promise<Record<string, Struttura>>>();
function strutture(distretto: Distretto, lato: Lato): Promise<Record<string, Struttura>> {
  const f = fileLibreria(distretto, lato);
  let p = cache.get(f);
  if (!p) {
    p = readFile(new URL(f, LIBRERIE), 'utf8').then((t) => registroCompleto(JSON.parse(t) as Libreria));
    p.catch(() => cache.delete(f));
    cache.set(f, p);
  }
  return p;
}

const testo = { type: 'string' } as const;

function schema(codici: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['testi', 'reperti', 'non_mappati'],
    properties: {
      testi: {
        type: 'object',
        additionalProperties: false,
        required: ['diagnosi', 'anamnesi', 'esame_obiettivo', 'esame_strumentale', 'terapia'],
        properties: { diagnosi: testo, anamnesi: testo, esame_obiettivo: testo, esame_strumentale: testo, terapia: testo },
      },
      reperti: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['codice', 'tipo', 'peso', 'fonte', 'titolo', 'frase'],
          properties: {
            codice: { anyOf: [{ type: 'string', enum: codici }, { type: 'null' }] },
            tipo: { type: 'string', enum: [...TIPI_REPERTO] },
            peso: { type: 'integer', enum: [0, 1, 2, 3] },
            fonte: { type: 'string', enum: [...FONTI] },
            titolo: testo,
            frase: testo,
          },
        },
      },
      non_mappati: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['frase', 'motivo'],
          properties: { frase: testo, motivo: testo },
        },
      },
    },
  };
}

function istruzioni(distretto: Distretto, lato: Lato, S: Record<string, Struttura>): string {
  const elenco = Object.entries(S)
    .map(([c, s]) => `- ${c}: ${s.n} (${s.k}${s.p && s.p !== c ? `, parte di ${s.p}` : ''}). ${s.d}`)
    .join('\n');
  const fonti = FONTI.map((f) => `${f} = ${FONTI_ETICHETTE[f]}`).join(', ');
  return `Sei l'assistente di un ortopedico. Trasformi il referto di una visita (con l'eventuale referto della risonanza o di altri esami) nei dati di Deep Anatomy, che servono a spiegarlo al paziente. Il distretto indicato dal medico è: ${nomeDistretto(distretto, lato)}.

REGOLE GENERALI
- Non inventare nulla. Usa solo ciò che è scritto nel referto. Se un'informazione manca, lascia il campo vuoto ("").
- Copia le frasi del medico così come sono, senza riscriverle, riassumerle o correggerle (puoi solo togliere intestazioni come "Anamnesi:").
- Non riportare dati personali del paziente (nome, data di nascita, codice fiscale, indirizzo, telefono): toglili dai testi.

I CINQUE TESTI
- diagnosi: la conclusione del medico.
- anamnesi: la storia del problema raccontata dal paziente.
- esame_obiettivo: cosa ha trovato il medico visitando (test clinici, mobilità, dolore, gonfiore).
- esame_strumentale: cosa riportano RM, ecografia, radiografie o TC.
- terapia: le indicazioni (farmaci, fisioterapia, riposo, controlli, interventi).
Se il referto non ha sezioni con questi nomi, attribuisci ogni frase al campo giusto.

I REPERTI
Un reperto per ogni struttura anatomica di cui il referto descrive lo stato, comprese quelle dichiarate esplicitamente normali ("LCA integro", "tendine regolare"). Non creare reperti per strutture che il referto non nomina.
- codice: il codice della struttura nell'elenco qui sotto. Scegli il più preciso: se il referto indica una parte (es. il corno posteriore), usa il codice della parte; se parla della struttura intera, usa il codice dell'intera struttura. Se nessun codice corrisponde, metti null.
- tipo: lesione (rottura, lesione, lacerazione, fissurazione, distacco), usura (degenerazione, tendinosi, condropatia, artrosi, assottigliamento), edema (edema osseo o dei tessuti, contusione ossea), versamento (versamento, falda fluida, borsite con liquido, cisti), norma (integro, regolare, nella norma).
- peso: una lettura per il paziente, non una classificazione clinica. 3 = importante (rotture complete o di alto grado, lesioni che cambiano la terapia), 2 = moderato, 1 = lieve (iniziale, modesto, minimo), 0 = solo per tipo norma.
- fonte: da quale esame viene il reperto (${fonti}).
- titolo: un titolo breve e chiaro, in italiano, es. "Lesione del corno posteriore del menisco mediale".
- frase: la frase o la parte di frase del referto che descrive il reperto, copiata esattamente.
Se più esami descrivono la stessa struttura, fai un solo reperto con la fonte più precisa (di solito l'immagine) e la sua frase.

NON MAPPATI
Metti in non_mappati, con un motivo breve, le frasi che descrivono un reperto ma che non hai trasformato in reperto: test clinici che confermano un reperto già presente, reperti fuori dal distretto o di un lato diverso, frasi ambigue. Non metterci frasi di anamnesi o terapia.

STRUTTURE DELLA LIBRERIA (${nomeDistretto(distretto, lato)})
${elenco}`;
}

export async function importa(req: RichiestaImporta): Promise<RispostaImporta> {
  const chiave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chiave) {
    throw new ErroreImporta(503, 'Il server non ha la chiave ANTHROPIC_API_KEY: Importa funziona solo con i referti di esempio.');
  }
  if (!req.testo?.trim() && !req.file) throw new ErroreImporta(400, 'Manca il referto: incolla il testo o carica un file.');

  let S: Record<string, Struttura>;
  try {
    S = await strutture(req.distretto, req.lato);
  } catch {
    throw new ErroreImporta(404, `Non c'è una libreria di tavole per ${nomeDistretto(req.distretto, req.lato)}.`);
  }

  const content: Anthropic.ContentBlockParam[] = [];
  if (req.file) {
    content.push(
      req.file.tipo === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: req.file.dati } }
        : { type: 'image', source: { type: 'base64', media_type: req.file.tipo, data: req.file.dati } },
    );
  }
  content.push({
    type: 'text',
    text: req.testo?.trim()
      ? `Ecco il referto da trasformare${req.file ? ' (c\'è anche un file allegato: usa entrambi)' : ''}.\n\n<referto>\n${req.testo.trim()}\n</referto>`
      : 'Il referto da trasformare è nel file allegato.',
  });

  const client = new Anthropic({ apiKey: chiave, maxRetries: 2, timeout: 120_000 });
  let risposta: Anthropic.Message;
  try {
    risposta = await client.messages.create({
      model: modello(),
      max_tokens: 8000,
      system: istruzioni(req.distretto, req.lato, S),
      messages: [{ role: 'user', content }],
      output_config: { format: { type: 'json_schema', schema: schema(Object.keys(S)) } },
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      const msg = e.status === 401 ? 'La chiave del modello non è valida.'
        : e.status === 429 ? 'Troppe richieste al modello: riprova tra poco.'
        : e.status === 400 ? `Richiesta rifiutata dal modello: ${e.message}`
        : `Il servizio del modello non risponde (${e.status ?? 'rete'}).`;
      throw new ErroreImporta(502, msg);
    }
    throw new ErroreImporta(502, 'Il servizio del modello non risponde.');
  }

  if (risposta.stop_reason === 'refusal') throw new ErroreImporta(422, 'Il modello non ha voluto elaborare questo documento.');
  if (risposta.stop_reason === 'max_tokens') throw new ErroreImporta(422, 'Il referto è troppo lungo per essere elaborato in una volta.');
  const blocco = risposta.content.find((b) => b.type === 'text');
  let dati: unknown;
  try {
    dati = JSON.parse(blocco?.type === 'text' ? blocco.text : '');
  } catch {
    throw new ErroreImporta(502, 'La risposta del modello non è un JSON valido.');
  }

  const ok = RispostaImporta.safeParse({ ...(dati as object), modello: risposta.model });
  if (!ok.success) throw new ErroreImporta(502, 'La risposta del modello non ha il formato atteso.');
  // difesa in profondità: un codice che non è nella libreria diventa "senza posizione"
  const out = ok.data;
  out.reperti = out.reperti.map((r) => (r.codice && !S[r.codice] ? { ...r, codice: null } : r))
    .map((r) => (r.tipo === 'norma' ? { ...r, peso: 0 as const } : r.peso === 0 ? { ...r, peso: 1 as const } : r));
  return out;
}
