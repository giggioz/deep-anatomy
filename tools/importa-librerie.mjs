#!/usr/bin/env node
/**
 * Copia nell'app le librerie di Tavole Anatomiche prodotte dalla skill "tavole-anatomiche".
 *
 *   npm run librerie -- <cartella> [<cartella> ...]
 *
 * Ogni cartella contiene un library.json (l'uscita della skill per un distretto e un lato). Il file finisce in
 * apps/web/public/librerie/<distretto>-<lato>.json e l'indice librerie/indice.json viene rigenerato.
 * Senza argomenti rigenera solo l'indice.
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEST = fileURLToPath(new URL('../apps/web/public/librerie/', import.meta.url));
const DISTRETTI = ['ginocchio', 'spalla', 'gomito'];
const LATI = ['destro', 'sinistro'];

function controlla(lib, da) {
  const errori = [];
  if (!DISTRETTI.includes(lib.distretto)) errori.push(`distretto "${lib.distretto}" sconosciuto (aggiungilo a DISTRETTI in packages/shared/src/schema.ts)`);
  if (!LATI.includes(lib.lato)) errori.push(`lato "${lib.lato}" non valido`);
  if (!lib.registro || !Array.isArray(lib.tavole) || !lib.tavole.length) errori.push('registro o tavole mancanti');
  for (const t of lib.tavole ?? []) {
    if (!t.layout || !t.parte) errori.push(`tavola ${t.id}: mancano layout/parte (rigenera con la versione attuale della skill)`);
    for (const id of t.ids ?? []) if (!lib.registro?.[id]) errori.push(`tavola ${t.id}: codice ${id} non è nel registro`);
  }
  if (errori.length) throw new Error(`${da}:\n  - ${errori.join('\n  - ')}`);
}

async function copia(cartella) {
  let file = resolve(cartella);
  if ((await stat(file)).isDirectory()) file = join(file, 'library.json');
  const lib = JSON.parse(await readFile(file, 'utf8'));
  controlla(lib, file);
  const nome = `${lib.distretto}-${lib.lato}.json`;
  await writeFile(join(DEST, nome), JSON.stringify(lib));
  console.log(`✓ ${nome}  ${Object.keys(lib.registro).length} strutture, ${lib.tavole.length} tavole  (da ${file})`);
}

async function indice() {
  const voci = [];
  for (const f of (await readdir(DEST)).sort()) {
    if (!f.endsWith('.json') || f === 'indice.json') continue;
    const lib = JSON.parse(await readFile(join(DEST, f), 'utf8'));
    voci.push({ distretto: lib.distretto, lato: lib.lato, nome: lib.nome, versione: lib.versione, stato: lib.stato, file: f });
  }
  await writeFile(join(DEST, 'indice.json'), JSON.stringify(voci, null, 2) + '\n');
  console.log(`✓ indice.json  ${voci.map((v) => `${v.distretto}-${v.lato}`).join(', ')}`);
}

try {
  for (const c of process.argv.slice(2)) await copia(c);
  await indice();
} catch (e) {
  console.error(`✗ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
