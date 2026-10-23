/**
 * Nuova password dal link di recupero arrivato per email.
 * Prima chiede al server se il link vale ancora, così il medico non scrive una password per niente.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { PASSWORD_MIN, problemaPassword, type RispostaGettone } from '@deep-anatomy/shared';
import { chiedi, entrato } from '../store/accesso';
import { link, vai } from '../router';
import { CampoPassword } from '../components/CampoPassword';
import { PaginaFuori } from '../components/PaginaFuori';

export function ImpostaPassword({ gettone }: { gettone: string }) {
  const [info, setInfo] = useState<RispostaGettone | 'carica' | string>('carica');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    let vivo = true;
    if (!gettone) { setInfo('Il link è incompleto. Copialo per intero dall\'email, o chiedine uno nuovo.'); return; }
    chiedi<RispostaGettone>(`/api/auth/gettone?t=${encodeURIComponent(gettone)}`).then((r) => {
      if (vivo) setInfo(r.ok ? r.dati : r.errore);
    });
    return () => { vivo = false; };
  }, [gettone]);

  async function invia(e: FormEvent) {
    e.preventDefault();
    const email = typeof info === 'object' ? info.email : undefined;
    const problema = problemaPassword(password, email);
    if (problema) return setErrore(problema);
    setInvio(true);
    const r = await chiedi('/api/auth/reimposta', { gettone, password });
    setInvio(false);
    if (!r.ok) return setErrore(r.errore);
    entrato(r.dati);
    vai(link.home);
  }

  if (info === 'carica') return <PaginaFuori titolo="Un momento…"><p className="muted">Controllo il link.</p></PaginaFuori>;
  if (typeof info === 'string') {
    return (
      <PaginaFuori titolo="Link non valido" testo={info}>
        <a className="btn primary" href={link.recupero}>Chiedi un nuovo link</a>
        <a className="accesso-link" href={link.home}>← Torna all'accesso</a>
      </PaginaFuori>
    );
  }

  return (
    <PaginaFuori titolo="Nuova password"
      testo={<>Scegli la password per <b>{info.email}</b>.</>} onInvia={invia}>
      {/* per i gestori di password: a quale account appartiene la password nuova */}
      <input type="email" autoComplete="username" value={info.email} readOnly hidden />
      <CampoPassword etichetta="Nuova password" completa="new-password" valore={password} autoFocus
        nota={`Almeno ${PASSWORD_MIN} caratteri. Una frase di più parole è facile da ricordare e difficile da indovinare.`}
        onCambia={(v) => { setPassword(v); setErrore(null); }} />
      {errore && <p className="accesso-errore" role="alert">{errore}</p>}
      <button className="btn primary" type="submit" disabled={invio}>{invio ? 'Salvo…' : 'Salva ed entra'}</button>
    </PaginaFuori>
  );
}
