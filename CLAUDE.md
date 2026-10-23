# Deep Anatomy · note per Claude

Web app che spiega al paziente la diagnosi dell'ortopedico, con testi semplici e le **Tavole Anatomiche pregenerate**.
Nome provvisorio. Il progetto nasce come "Referto spiegato"; le demo per il cliente sono **Demo-Ginocchio** e **Demo-Spalla**.
Il README descrive struttura, comandi e formato dei dati: leggilo prima di cambiare qualcosa.

## Chi la usa
- L'utente è l'**ortopedico**: amplia o sostituisce il referto della risonanza con la sua diagnosi.
- Il paziente riceve la pagina generata da ciò che il medico ha scritto. Nulla viene inventato o generato al momento.

## Decisioni prese
1. Due ingressi: **Crea diagnosi** (modulo) e **Importa diagnosi** (un modello linguistico legge testo, foto o PDF).
   Importa precompila lo stesso modulo; il medico controlla tutto prima di generare.
2. I reperti si scelgono **toccando le tavole**, con in più ricerca per nome. Niente tasto rapido "nella norma": anche la norma si indica dal tipo di reperto.
3. I cinque testi (Diagnosi, Anamnesi, Esame obiettivo, Esame strumentale, Terapia) sono **tutti visibili al paziente**.
4. Distretto e lato si scelgono per primi: decidono la libreria di tavole.
5. Importa in demo: solo con un **avviso** e dati inventati. La riservatezza vera (dati sanitari, dove gira il modello) è da risolvere prima di usare referti reali.
6. Web app, stack Node + React + TypeScript (Fastify sul server).
7. Accesso: registrazione libera con conferma dell'email (l'account nasce al click sul link), sessione in cookie httpOnly
   con hash in MongoDB, recupero password via email. `npm run utenti` solo per elencare e disattivare.
   Produzione sulla VPS IONOS di Climbcast (vedi `deploy/README.md`).

## Vincoli
- **Non nominare la fonte del modello 3D** da cui derivano le tavole: né nell'interfaccia, né nel README, né nelle pagine,
  né in testi che il cliente può vedere. È un vantaggio competitivo. In questo repo le tavole sono "Tavole Anatomiche" e basta.
- L'app **non disegna**: legge `apps/web/public/librerie/*.json` e accende le strutture dai codici. Le tavole si producono
  fuori dal repo con la skill `tavole-anatomiche` e si importano con `npm run librerie -- <cartella>`.
- I **codici** delle strutture sono stabili: non rinominarli, le diagnosi salvate li usano.
- Ogni reperto ha un numero sulle tavole, **anche quelli nella norma** (cerchio verde con il numero, niente spunta).
- Nelle pagine per il paziente: niente piè di pagina con fonti o note tecniche; le viste d'insieme e le viste del radiologo
  (sezioni RM, pannello scuro) restano separate; i numeri sulle tavole aprono il popup con la scheda del reperto.
- La chiave del modello sta solo nel server (`.env`). Mai nel browser.
- Demo: solo dati inventati.

## Convenzioni
- Codice, nomi e testi dell'interfaccia in italiano.
- Il contratto dei dati è in `packages/shared` (zod): web e server lo importano da lì. Se cambi lo schema, cambia anche
  lo schema JSON di uscita in `apps/server/src/importa.ts`.
- Frasi standard per il paziente in `packages/shared/src/spiegazioni.ts`: vanno fatte validare da un medico, come le tavole.
- Stile della pagina del paziente: quello delle demo (Newsreader + IBM Plex, carta chiara, banco scuro per le RM).

## Aperto
- Provare Importa con una chiave vera (prompt e schema non ancora collaudati con il modello).
- Persistenza delle diagnosi e link condivisibile per il paziente (oggi `localStorage` + stampa/PDF; il database c'è già per gli account).
- Le descrizioni dei padri (menisco intero, labbro glenoideo intero) stanno in `packages/shared/src/libreria.ts`: andrebbero portate nel registro prodotto dalla skill.
- Validazione medica di tavole e frasi; valutazione regolatoria; dove elaborare i dati (UE).
