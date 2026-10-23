/**
 * Email ai medici: invito, recupero della password, avviso di password cambiata.
 *
 * Senza SMTP_HOST (in sviluppo) le email non partono: il server scrive nel log destinatario, oggetto e link.
 */
import nodemailer, { type Transporter } from 'nodemailer';

export type Email = { a: string; oggetto: string; testo: string; html: string };
export type Spedisci = (email: Email) => Promise<void>;
/** basta questo del logger: va bene quello di Fastify o uno che scrive in console */
export type Registro = { info: (dati: object, testo: string) => void; warn: (testo: string) => void };

export function creaPosta(log: Registro): Spedisci {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    log.warn('SMTP_HOST assente: le email non partono, il link si legge nel log');
    return async (e) => { log.info({ a: e.a, oggetto: e.oggetto }, `EMAIL NON INVIATA\n${e.testo}`); };
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const trasporto: Transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
  });
  const da = { name: 'Deep Anatomy', address: process.env.SMTP_FROM?.trim() || 'noreply@infinitymundi.it' };
  return async (e) => {
    await trasporto.sendMail({ from: da, to: e.a, subject: e.oggetto, text: e.testo, html: e.html });
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Corpo comune: due paragrafi, un tasto, il link in chiaro, una nota in fondo. */
function componi(a: string, oggetto: string, righe: string[], tasto: { testo: string; link: string } | null, nota: string): Email {
  const testo = [...righe, ...(tasto ? [`${tasto.testo}: ${tasto.link}`] : []), nota, 'Deep Anatomy'].join('\n\n');
  const p = (t: string) => `<p style="margin:0 0 16px;font:16px/1.5 Georgia,serif;color:#1b2430">${esc(t)}</p>`;
  const html = [
    '<div style="max-width:520px;margin:0 auto;padding:32px 24px;background:#fbfaf7">',
    '<p style="margin:0 0 24px;font:600 22px/1.2 Georgia,serif;color:#1b2430">Deep Anatomy</p>',
    ...righe.map(p),
    tasto
      ? `<p style="margin:24px 0"><a href="${esc(tasto.link)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1f3a5f;color:#fff;font:600 15px Arial,sans-serif;text-decoration:none">${esc(tasto.testo)}</a></p>` +
        `<p style="margin:0 0 16px;font:13px/1.5 Arial,sans-serif;color:#5b6573">Se il tasto non funziona, copia questo indirizzo nel browser:<br>${esc(tasto.link)}</p>`
      : '',
    `<p style="margin:24px 0 0;font:13px/1.5 Arial,sans-serif;color:#5b6573">${esc(nota)}</p>`,
    '</div>',
  ].join('');
  return { a, oggetto, testo, html };
}

export function emailConferma(a: string, nome: string, link: string, ore: number): Email {
  return componi(a, 'Conferma la tua registrazione a Deep Anatomy',
    [`Buongiorno ${nome},`, 'per completare la registrazione a Deep Anatomy conferma il tuo indirizzo email dal link qui sotto.'],
    { testo: 'Conferma l\'email', link },
    `Il link vale ${ore} ore e si può usare una volta sola. Se la registrazione non l'hai chiesta tu, ignora questa email: senza conferma l'account non viene creato.`);
}

/** Qualcuno si registra con un'email che ha già un account: lo diciamo al proprietario, non a chi ha compilato il modulo. */
export function emailGiaRegistrato(a: string, accesso: string, recupero: string): Email {
  return componi(a, 'Hai già un account Deep Anatomy',
    ['Qualcuno ha appena chiesto di registrarsi a Deep Anatomy con questo indirizzo, che ha già un account.', `Per entrare usa la pagina di accesso: ${accesso}`],
    { testo: 'Ho dimenticato la password', link: recupero },
    'Se la registrazione non l\'hai chiesta tu, puoi ignorare questa email: il tuo account non è cambiato.');
}

export function emailRecupero(a: string, link: string, minuti: number): Email {
  return componi(a, 'Recupero della password di Deep Anatomy',
    ['Abbiamo ricevuto una richiesta di recupero della password per questo indirizzo.'],
    { testo: 'Scegli una nuova password', link },
    `Il link vale ${minuti} minuti e si può usare una volta sola. Se non hai chiesto tu il recupero, ignora questa email: la password resta quella di prima.`);
}

export function emailPasswordCambiata(a: string): Email {
  return componi(a, 'La password di Deep Anatomy è cambiata',
    ['La password del tuo account Deep Anatomy è stata appena cambiata, e gli altri dispositivi sono stati disconnessi.'],
    null,
    'Se non hai cambiato tu la password, usa subito "Password dimenticata?" nella pagina di accesso e avvisa l\'amministratore.');
}
