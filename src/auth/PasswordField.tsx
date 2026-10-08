import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  id: string; label: string; value: string; onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password'; error?: string; hint?: string; disabled?: boolean;
}
export default function PasswordField({ id, label, value, onChange, autoComplete, error, hint, disabled }: Props) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  return <div className="portal-field">
    <label htmlFor={id}>{label}</label>
    <div className={`portal-password${error ? ' has-error' : ''}`}>
      <input id={id} name={id} type={visible ? 'text' : 'password'} value={value}
        onChange={e => onChange(e.target.value)} autoComplete={autoComplete} disabled={disabled}
        required maxLength={128} aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onKeyUp={e => setCaps(e.getModifierState('CapsLock'))}
        onKeyDown={e => setCaps(e.getModifierState('CapsLock'))} onBlur={() => setCaps(false)} />
      <button type="button" className="portal-eye" onClick={() => setVisible(v => !v)}
        aria-label={visible ? `${label} verbergen` : `${label} anzeigen`} aria-pressed={visible} disabled={disabled}>
        {visible ? <EyeOff size={19}/> : <Eye size={19}/>}
      </button>
    </div>
    {hint && !error && <small id={`${id}-hint`} className="portal-hint">{hint}</small>}
    {error && <small id={`${id}-error`} className="portal-field-error">{error}</small>}
    {caps && <small className="portal-caps" role="status">Die Feststelltaste ist aktiviert.</small>}
  </div>;
}
