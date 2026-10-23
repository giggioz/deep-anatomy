/** Campo password con "Mostra": meglio vedere cosa si scrive che ripeterlo due volte. */
import { useState } from 'react';

type Props = {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  /** current-password per entrare, new-password per sceglierne una */
  completa: 'current-password' | 'new-password';
  nota?: string;
  autoFocus?: boolean;
};

export function CampoPassword({ etichetta, valore, onCambia, completa, nota, autoFocus }: Props) {
  const [mostra, setMostra] = useState(false);
  return (
    <label className="field">
      <span>{etichetta}</span>
      <span className="campo-password">
        <input type={mostra ? 'text' : 'password'} autoComplete={completa} value={valore} autoFocus={autoFocus}
          spellCheck={false} autoCapitalize="none" onChange={(e) => onCambia(e.target.value)} />
        <button type="button" className="btn small" onClick={() => setMostra(!mostra)} aria-pressed={mostra}>
          {mostra ? 'Nascondi' : 'Mostra'}
        </button>
      </span>
      {nota && <small>{nota}</small>}
    </label>
  );
}
