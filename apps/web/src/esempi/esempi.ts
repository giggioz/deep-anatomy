/**
 * Referti di esempio per provare Importa. Sono inventati: nessun paziente reale.
 * Ognuno ha anche il risultato già pronto, usato quando il server non ha la chiave del modello linguistico:
 * così la demo funziona anche offline.
 */
import type { Distretto, Lato, RispostaImporta } from '@deep-anatomy/shared';

export interface Esempio {
  id: string;
  distretto: Distretto;
  lato: Lato;
  titolo: string;
  descrizione: string;
  testo: string;
  risultato: RispostaImporta;
}

const GINOCCHIO = {
  anamnesi:
    'Dolore al ginocchio destro da circa due mesi, comparso dopo una torsione giocando a calcetto. Dolore sul lato interno, peggiora salendo le scale e accovacciandosi. Riferisce episodi occasionali di blocco.',
  esame_obiettivo:
    'Modesto versamento. Dolore alla palpazione dell\'emirima articolare mediale. McMurray positivo per il menisco mediale. Lachman e cassetto anteriore negativi. Stabile in varo-valgo. Flessione completa ma dolorosa negli ultimi gradi.',
  esame_strumentale:
    'RM del ginocchio destro: lesione obliqua del corno posteriore del menisco mediale che raggiunge la superficie articolare inferiore. Edema della spongiosa del condilo femorale mediale in sede di carico. Modesta falda di versamento articolare nel recesso sovrapatellare. Iniziale condropatia della faccetta rotulea. LCA regolare per morfologia e segnale.',
  diagnosi:
    'Lesione del corno posteriore del menisco mediale del ginocchio destro, con edema osseo reattivo del condilo femorale mediale.',
  terapia:
    'Riposo funzionale e ghiaccio per 10 giorni, antinfiammatorio al bisogno. Fisioterapia per il rinforzo del quadricipite. Controllo tra 6 settimane: se i blocchi continuano, valutare un\'artroscopia.',
};

const SPALLA = {
  anamnesi:
    'Dolore alla spalla destra da circa quattro mesi, senza un trauma preciso. Lavora molte ore con le braccia sollevate. Il dolore peggiora di notte e quando alza il braccio sopra la testa.',
  esame_obiettivo:
    'Arco doloroso tra 70° e 120° di abduzione. Test di Jobe positivo per dolore, forza conservata. Hawkins positivo. Belly press negativo. Dolore alla palpazione dell\'articolazione acromion-claveare. Nessun segno di instabilità.',
  esame_strumentale:
    'RM della spalla destra: lesione parziale del tendine sovraspinato sul versante articolare, in zona critica. Falda fluida nella borsa sottoacromion-deltoidea. Edema della spongiosa del trochite all\'inserzione del sovraspinato. Note artrosiche acromion-claveari. Note degenerative del labbro glenoideo anteriore. Tendine sottoscapolare regolare.',
  diagnosi:
    'Sindrome da conflitto sottoacromiale della spalla destra, con lesione parziale articolare del sovraspinato e borsite.',
  terapia:
    'Evitare per un mese i lavori con il braccio sopra la spalla. Antinfiammatorio per 7 giorni. Fisioterapia per il controllo della scapola e il rinforzo della cuffia. Possibile infiltrazione sottoacromiale se il dolore notturno continua. Controllo tra 8 settimane.',
};

function referto(titolo: string, t: typeof GINOCCHIO): string {
  return [
    titolo,
    '',
    `Anamnesi: ${t.anamnesi}`,
    '',
    `Esame obiettivo: ${t.esame_obiettivo}`,
    '',
    `Esame strumentale: ${t.esame_strumentale}`,
    '',
    `Diagnosi: ${t.diagnosi}`,
    '',
    `Terapia: ${t.terapia}`,
  ].join('\n');
}

export const ESEMPI: Esempio[] = [
  {
    id: 'ginocchio-menisco',
    distretto: 'ginocchio',
    lato: 'destro',
    titolo: 'Ginocchio · menisco mediale',
    descrizione: 'Torsione a calcetto, lesione del corno posteriore, edema osseo, versamento.',
    testo: referto('VISITA ORTOPEDICA · ginocchio destro', GINOCCHIO),
    risultato: {
      modello: 'esempio preparato',
      testi: GINOCCHIO,
      reperti: [
        { codice: 'menisco-mediale-corno-posteriore', tipo: 'lesione', peso: 3, fonti: ['rm'],
          titolo: 'Lesione del corno posteriore del menisco mediale',
          frase: 'Lesione obliqua del corno posteriore del menisco mediale che raggiunge la superficie articolare inferiore.' },
        { codice: 'femore-condilo-mediale', tipo: 'edema', peso: 2, fonti: ['rm'],
          titolo: 'Edema osseo del condilo femorale mediale',
          frase: 'Edema della spongiosa del condilo femorale mediale in sede di carico.' },
        { codice: 'recesso-sovrapatellare', tipo: 'versamento', peso: 2, fonti: ['rm'],
          titolo: 'Versamento articolare',
          frase: 'Modesta falda di versamento articolare nel recesso sovrapatellare.' },
        { codice: 'cartilagine-rotulea', tipo: 'usura', peso: 1, fonti: ['rm'],
          titolo: 'Condropatia rotulea lieve',
          frase: 'Iniziale condropatia della faccetta rotulea.' },
        { codice: 'lca', tipo: 'norma', peso: 0, fonti: ['rm'],
          titolo: 'Legamento crociato anteriore integro',
          frase: 'LCA regolare per morfologia e segnale.' },
      ],
      non_mappati: [
        { frase: 'McMurray positivo per il menisco mediale.',
          motivo: 'Test clinico: conferma la lesione del menisco mediale già indicata dalla RM, non aggiunto come reperto separato.' },
      ],
    },
  },
  {
    id: 'spalla-cuffia',
    distretto: 'spalla',
    lato: 'destro',
    titolo: 'Spalla · cuffia dei rotatori',
    descrizione: 'Conflitto sottoacromiale, lesione parziale del sovraspinato, borsite.',
    testo: referto('VISITA ORTOPEDICA · spalla destra', SPALLA),
    risultato: {
      modello: 'esempio preparato',
      testi: SPALLA,
      reperti: [
        { codice: 'sovraspinato-tendine', tipo: 'lesione', peso: 3, fonti: ['rm'],
          titolo: 'Lesione parziale del tendine sovraspinato',
          frase: 'Lesione parziale del tendine sovraspinato sul versante articolare, in zona critica.' },
        { codice: 'borsa-sottoacromiale', tipo: 'versamento', peso: 2, fonti: ['rm'],
          titolo: 'Borsite sottoacromion-deltoidea',
          frase: 'Falda fluida nella borsa sottoacromion-deltoidea.' },
        { codice: 'trochite', tipo: 'edema', peso: 2, fonti: ['rm'],
          titolo: 'Edema osseo del trochite',
          frase: 'Edema della spongiosa del trochite all\'inserzione del sovraspinato.' },
        { codice: 'articolazione-acromion-claveare', tipo: 'usura', peso: 2, fonti: ['rm'],
          titolo: 'Artrosi acromion-claveare',
          frase: 'Note artrosiche acromion-claveari.' },
        { codice: 'labbro-glenoideo-anteriore', tipo: 'usura', peso: 1, fonti: ['rm'],
          titolo: 'Labbro glenoideo anteriore degenerato',
          frase: 'Note degenerative del labbro glenoideo anteriore.' },
        { codice: 'sottoscapolare-tendine', tipo: 'norma', peso: 0, fonti: ['rm'],
          titolo: 'Tendine sottoscapolare integro',
          frase: 'Tendine sottoscapolare regolare.' },
      ],
      non_mappati: [
        { frase: 'Test di Jobe positivo per dolore, forza conservata. Hawkins positivo.',
          motivo: 'Test clinici del conflitto sul sovraspinato: confermano il reperto della RM, non aggiunti come reperti separati.' },
      ],
    },
  },
];

export function esempioPerTesto(testo: string): Esempio | undefined {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const t = norm(testo);
  return ESEMPI.find((e) => norm(e.testo) === t);
}
