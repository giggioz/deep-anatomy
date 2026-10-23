# Deep Anatomy

La diagnosi dell'ortopedico, spiegata al paziente con parole semplici e con le **Tavole Anatomiche** pregenerate.

Il medico scrive (o importa) la diagnosi e indica i reperti toccando le strutture sulle tavole. Il paziente riceve una pagina
con i testi del medico, le spiegazioni semplici e i disegni con i reperti numerati. Nessun disegno viene generato al momento:
le tavole sono già pronte e validate, l'app le accende a partire dai codici delle strutture.

> Stato: **prototipo per demo**. Usa solo dati inventati.

## Come funziona

```
Crea diagnosi ──┐
                ├─► 1 · Testi  ─►  2 · Reperti  ─►  3 · Pagina del paziente
Importa ────────┘   (5 campi)      (sulle tavole)    (approvazione, poi stampa / PDF)
```

1. **Distretto e lato** (ginocchio, spalla, gomito · destro, sinistro): decidono quale libreria di tavole si usa.
2. **Testi**: Diagnosi, Anamnesi, Esame obiettivo, Esame strumentale, Terapia. Il paziente li vede tutti, così come sono scritti.
3. **Reperti**: il medico tocca una struttura sulla tavola (o la cerca per nome), sceglie il tipo
   (lesione, usura, edema, versamento, nella norma), quanto conta, da quale esame viene, la sua frase e, se vuole,
   una spiegazione sua. Anche i reperti nella norma hanno il loro numero.
4. **Pagina del paziente**: il documento come lo vedrà il paziente, con i controlli prima di approvare.
   Solo dopo l'approvazione si può stampare o salvare in PDF dal browser; una bozza in stampa esce come avviso.

**Importa diagnosi** fa la stessa cosa partendo da un referto già scritto (testo incollato, foto o PDF): un modello
linguistico divide il testo nei cinque campi e propone i reperti con i codici della libreria. Il medico arriva al passo 1
con tutto precompilato e controlla ogni campo. Le frasi che il modello non ha trasformato in reperti finiscono in
"Da controllare".

## Avvio

Serve Node 22 (vedi `.nvmrc`; basta Node ≥ 20.12).

```bash
npm install
cp .env.example .env      # va bene così per lo sviluppo; la chiave del modello è facoltativa
npm run db                # MongoDB di sviluppo (dati in .mongo/), in un terminale a parte
npm run dev               # web app su http://localhost:5173, server su http://localhost:8787
```

Il primo account si crea da **Registrati** nella pagina di accesso. Senza `SMTP_HOST` le email non partono:
il link (conferma o recupero) si legge nel terminale del server.

Un solo processo, come in produzione:

```bash
npm run build             # costruisce apps/web/dist
npm start                 # il server serve anche la web app su http://localhost:8787
```

Altri comandi: `npm run typecheck` (TypeScript su tutto il repo), `npm test` (test dell'accesso, con un Mongo in memoria),
`npm run librerie` (vedi sotto). La pubblicazione sulla VPS è in [deploy/README.md](deploy/README.md).

## Accesso

Registrazione libera: nome, email e password. L'account nasce solo quando il medico apre il link di conferma
arrivato per email (vale 24 ore). Fino ad allora la registrazione è un gettone in attesa, non un utente: nessuno può
occupare l'email di un altro registrandola per primo. Chi si registra con un'email che ha già un account vede la stessa
risposta, e al proprietario arriva un avviso.

- Password con almeno 10 caratteri, salvata come hash scrypt. Sessione in un cookie httpOnly, SameSite=Strict,
  Secure in https; nel database ci sono solo gli hash di sessioni e link. La sessione dura 14 giorni dall'ultimo uso.
- **Password dimenticata?** manda un link valido un'ora, una volta sola. La risposta è uguale che l'account esista o no.
- Dopo una password nuova (dal link o da **Account**) gli altri dispositivi escono e arriva un'email di avviso.
- Limiti contro i tentativi a raffica: per IP sulle rotte di accesso, e blocco di 15 minuti dopo 10 password sbagliate.
- Tutte le rotte `/api/*` chiedono l'accesso, tranne `/api/salute` e quelle di `/api/auth/*` che servono per entrare.

## Struttura

```
packages/shared/      il contratto dei dati, usato da web e server
  src/schema.ts         Diagnosi, Reperto, Testi, richieste e risposte di Importa (zod)
  src/accesso.ts        richieste e risposte di /api/auth, regole della password
  src/libreria.ts       formato delle Tavole Anatomiche (library.json)
  src/spiegazioni.ts    frasi standard per il paziente (tipi di reperto, gravità, fonti)
apps/web/             React + Vite
  public/librerie/      le librerie di tavole, una per distretto e lato, + indice.json
  src/tavole/           Tavola.tsx (SVG interattivo), overlay.ts (disegno dei reperti), materiali.css, defs.svg
  src/pages/            Home, Nuova, Importa, Testi, Reperti, Paziente;
                        Accesso, Registrazione, Conferma, Recupero, ImpostaPassword, Account
  src/components/       PaginaPaziente (il documento), SchedaReperto, Barra, ...
  src/store/            diagnosi salvate nel browser (localStorage), stato dell'accesso
  src/esempi/           referti inventati per provare Importa, con il risultato già pronto
apps/server/          Fastify + MongoDB
  src/index.ts          legge il .env, apre il database, si mette in ascolto
  src/app.ts            le rotte: /api/salute, /api/importa, accesso; serve apps/web/dist se esiste
  src/accesso.ts        /api/auth/*: registrazione e conferma, sessioni, recupero e cambio della password
  src/utenti.ts         npm run utenti: elenco, disattiva, riattiva
  src/importa.ts        prompt, schema di uscita e chiamata al modello
deploy/               VPS: PM2, nginx, script di pubblicazione (vedi deploy/README.md)
tools/
  importa-librerie.mjs  copia nell'app le librerie prodotte dalla skill
  db-sviluppo.mjs       MongoDB locale per lo sviluppo (npm run db)
```

## Il contratto dei dati

Una diagnosi è tutto ciò che serve per costruire la pagina del paziente:

```json
{
  "distretto": "ginocchio", "lato": "destro",
  "testi": { "diagnosi": "…", "anamnesi": "…", "esame_obiettivo": "…", "esame_strumentale": "…", "terapia": "…" },
  "reperti": [
    { "n": 1, "codice": "menisco-mediale-corno-posteriore", "tipo": "lesione", "peso": 3, "fonti": ["rm"],
      "titolo": "Lesione del corno posteriore del menisco mediale",
      "frase": "Lesione obliqua del corno posteriore del menisco mediale…" }
  ]
}
```

- `codice` è il codice di una struttura della libreria (o `null`: il reperto compare solo nell'elenco).
  Un codice padre (`menisco-mediale`) accende tutte le sue parti.
- `peso`: 3 importante, 2 moderato, 1 lieve, 0 nella norma. Decide il colore: è una lettura per il paziente, non una classificazione clinica.
- `spiegazione` (facoltativa): se manca si usa la frase standard = descrizione della struttura + frase del tipo di reperto.

## Le Tavole Anatomiche

Le librerie (`apps/web/public/librerie/<distretto>-<lato>.json`) si producono fuori dall'app, con la skill
`tavole-anatomiche`, e vanno fatte validare da un medico. Ogni libreria ha un registro delle strutture
(codice → nome, tipo, descrizione semplice, padre) e le tavole: SVG in cui ogni struttura è
`<g class="st" data-id="codice">`, più i punti dove disegnare i numeri dei reperti.
Le tavole sono di due famiglie: **viste d'insieme** (per orientarsi) e **viste del radiologo** (sezioni sui piani della risonanza).

Per aggiornare l'app dopo aver rigenerato una libreria:

```bash
npm run librerie -- <cartella-uscita-skill> [<altra-cartella> ...]
```

Lo script controlla che tutti i codici delle tavole siano nel registro, copia i file con il nome giusto e rigenera `indice.json`.
I codici sono stabili: una diagnosi salvata resta valida anche con una nuova versione delle tavole.

## Importa e riservatezza

- La chiave del modello (`ANTHROPIC_API_KEY`) sta solo nel server. Il browser non la vede mai.
- Il server non scrive nei log il contenuto delle richieste.
- La pagina avvisa che il referto viene inviato a un servizio di intelligenza artificiale esterno e chiede di confermare
  che è inventato o anonimizzato. Il modello ha istruzione di non riportare dati personali nei campi.
- Le diagnosi della demo restano nel browser del medico (`localStorage`): nel database ci sono solo gli account.

Prima di usare referti veri servono: base giuridica e informativa per il trattamento di dati sanitari, accordo con il fornitore
del modello, valutazione su dove vengono elaborati i dati (l'API diretta elabora negli Stati Uniti o globalmente; per restare
nell'Unione Europea vanno valutati gli endpoint regionali dei fornitori cloud che distribuiscono gli stessi modelli),
e una valutazione regolatoria del software (quando una spiegazione per il paziente resta informativa e quando diventa dispositivo medico).

## Limiti noti

- Dati solo nel browser: la pagina del paziente si stampa o si salva in PDF, non c'è ancora un link da condividere.
- Distretti: ginocchio, spalla e gomito. Le librerie sono in stato "da validare".
- Le tavole sono schematiche, da un unico modello anatomico, non in scala.
- L'editor dei reperti è pensato per computer e tablet; sul telefono funziona ma le tavole sono piccole.
