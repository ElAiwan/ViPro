import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleCheck, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import { api, ApiError, errorMessage } from './api';
import type { User } from './api';
import PasswordField from './PasswordField';
import type { CompanyPortal } from '../companies/types';
import { portalURL } from './routes';

interface SharedProps { navigate: (route: string) => void; }
// Hands the identified e-mail to the company login without putting it into the URL.
const handoffKey = 'brudello-login-email';
function takeHandoffEmail(): string {
  try { const value = sessionStorage.getItem(handoffKey) ?? ''; sessionStorage.removeItem(handoffKey); return value; } catch { return ''; }
}
const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
function focusField(id: string) { requestAnimationFrame(() => document.getElementById(id)?.focus()); }
export function Message({ children, success = false }: { children: React.ReactNode; success?: boolean }) {
  return <div className={`portal-message${success ? ' success' : ''}`} role={success ? 'status' : 'alert'}>
    {success && <CircleCheck size={18}/>}<span>{children}</span>
  </div>;
}
function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button className="portal-primary" type="submit" disabled={busy}>
    {busy ? <><LoaderCircle size={18} className="portal-spin"/>Bitte warten …</> : <>{children}<ArrowRight size={18}/></>}
  </button>;
}
function Back({ navigate, busy }: SharedProps & { busy: boolean }) {
  return <button type="button" className="portal-back" disabled={busy} onClick={() => navigate('/anmelden')}>
    <ArrowLeft size={17}/>Zur Anmeldung
  </button>;
}
function EmailField({ value, onChange, error, disabled, allowCompanyId = false, hint }: { value: string; onChange: (v: string) => void; error?: string; disabled: boolean; allowCompanyId?: boolean; hint?: string }) {
  const describedBy = error ? 'email-error' : hint ? 'email-hint' : undefined;
  return <div className="portal-field"><label htmlFor="email">{allowCompanyId ? 'E-Mail-Adresse oder Unternehmens-ID' : 'E-Mail-Adresse'}</label>
    <input id="email" name="email" type={allowCompanyId ? 'text' : 'email'} autoComplete="username" autoCapitalize="none"
      spellCheck={false} inputMode={allowCompanyId ? 'text' : 'email'} value={value} onChange={e => onChange(e.target.value)}
      placeholder={allowCompanyId ? 'name@brudello.de oder mein-betrieb' : 'name@unternehmen.de'} disabled={disabled} maxLength={254} required
      aria-invalid={Boolean(error)} aria-describedby={describedBy}/>
    {error ? <small id="email-error" className="portal-field-error">{error}</small> : hint && <small id="email-hint" className="portal-hint">{hint}</small>}
  </div>;
}

export function LoginForm({ navigate, onLogin, flash, companyName }: SharedProps & { onLogin: (user: User) => void; flash: string; companyName?: string }) {
  // Main login is identifier-first: one field, then either the password step (e-mail) or the company's own login (ID).
  const main = !companyName;
  const [step, setStep] = useState<'identify' | 'password'>(main ? 'identify' : 'password');
  const [email, setEmail] = useState(() => main ? '' : takeHandoffEmail());
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  // The field that had focus is unmounted on a step change; move focus once the next step is rendered.
  const stepChanged = useRef(false);
  useEffect(() => {
    if (stepChanged.current) document.getElementById(step === 'password' ? 'password' : 'email')?.focus();
  }, [step]);
  // Leaving for another login keeps the button busy; Back restores this page from the bfcache in that state.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => { if (event.persisted) { setBusy(false); setError(''); } };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);
  async function identify(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    const value = email.trim();
    setError(''); setFields({});
    if (value.includes('@')) {
      if (!emailValid(value)) { setFields({ email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' }); focusField('email'); return; }
      setBusy(true);
      try {
        // Company accounts continue on their own login page; everyone else stays here.
        const { portal } = await api<{ portal: CompanyPortal | null }>('/auth/identify', { email: value });
        if (portal) {
          try { sessionStorage.setItem(handoffKey, value); } catch { /* the company login then starts empty */ }
          window.location.assign(portalURL(portal.portalSlug)); return;
        }
      } catch (err) { setError(errorMessage(err)); setBusy(false); return; }
      setBusy(false); stepChanged.current = true; setEmail(value); setStep('password'); return;
    }
    const code = value.toLowerCase().replace(/\s+/g, '-');
    if (!code || code.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) {
      setFields({ email: 'Bitte geben Sie Ihre E-Mail-Adresse oder Unternehmens-ID ein.' }); focusField('email'); return;
    }
    setBusy(true);
    try {
      const result = await api<{ portal: CompanyPortal }>(`/portals/${encodeURIComponent(code)}`);
      window.location.assign(portalURL(result.portal.portalSlug));
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    const next: Record<string, string> = {};
    if (!emailValid(email)) next.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    if (!password) next.password = 'Bitte geben Sie Ihr Passwort ein.';
    setFields(next); setError('');
    if (Object.keys(next).length) { focusField(Object.keys(next)[0]); return; }
    setBusy(true);
    try {
      const { user } = await api<{ user: User }>('/auth/login', { email, password, remember });
      // A company account signed in through the main login continues in its own portal.
      if (main && user.role === 'company_user' && user.companySlug) {
        window.location.assign(portalURL(user.companySlug, user.mustChangePassword ? '/passwort-aendern' : '/home')); return;
      }
      setBusy(false); onLogin(user);
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  }
  function changeIdentifier() { stepChanged.current = true; setStep('identify'); setPassword(''); setFields({}); setError(''); }
  return <>
    <div className="portal-form-heading"><span className="portal-access-label"><span/>{companyName ? `${companyName} · Unternehmensportal` : 'Brudello Partnerportal'}</span>
      <h1>Willkommen zurück.</h1><p>{companyName ? `Melden Sie sich mit Ihrem persönlichen Konto bei ${companyName} an.` : step === 'identify' ? 'Geben Sie Ihre E-Mail-Adresse oder Ihre Unternehmens-ID ein.' : 'Geben Sie jetzt Ihr Passwort ein.'}</p>
    </div>
    {flash && <Message success>{flash}</Message>}
    {error && <Message>{error}</Message>}
    {step === 'identify' ? <form noValidate onSubmit={identify} aria-busy={busy}>
      <EmailField value={email} onChange={value => { setEmail(value); setFields({}); setError(''); }} error={fields.email} disabled={busy} allowCompanyId
        hint="Mit Ihrer Unternehmens-ID öffnen Sie die Anmeldeseite Ihres Unternehmens."/>
      <Submit busy={busy}>Weiter</Submit>
    </form> : <form noValidate onSubmit={submit} aria-busy={busy}>
      {main ? <div className="portal-field portal-identity"><label htmlFor="email">E-Mail-Adresse</label>
        <div><input id="email" name="email" type="email" autoComplete="username" value={email} readOnly/>
          <button type="button" className="portal-link" onClick={changeIdentifier} disabled={busy}>Ändern</button></div></div>
        : <EmailField value={email} onChange={value => { setEmail(value); setFields({}); setError(''); }} error={fields.email} disabled={busy}/>}
      <PasswordField id="password" label="Passwort" value={password} onChange={setPassword}
        autoComplete="current-password" error={fields.password} disabled={busy}/>
      <div className="portal-form-options">
        <label className="portal-checkbox"><input type="checkbox" checked={remember} disabled={busy}
          onChange={e => setRemember(e.target.checked)}/>Angemeldet bleiben</label>
        <button type="button" className="portal-link" disabled={busy} onClick={() => navigate('/passwort-vergessen')}>Passwort vergessen?</button>
      </div>
      <Submit busy={busy}>Anmelden</Submit>
    </form>}
    <div className="portal-access-note"><KeyRound size={18}/><p>Noch keinen Zugang?<br/><span>Ihr Konto wird von Brudello eingerichtet.</span></p></div>
  </>;
}

export function ForgotForm({ navigate }: SharedProps) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setFieldError(''); setError('');
    if (!emailValid(email)) { setFieldError('Bitte geben Sie eine gültige E-Mail-Adresse ein.'); focusField('email'); return; }
    setBusy(true);
    try { await api('/auth/forgot-password', { email }); setSent(true); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <><Back navigate={navigate} busy={busy}/>
    <div className="portal-step-icon">{sent ? <Mail size={25}/> : <KeyRound size={25}/>}</div>
    <div className="portal-form-heading">
      <h1>{sent ? 'Prüfen Sie Ihr Postfach.' : 'Passwort vergessen?'}</h1>
      <p>{sent ? 'Falls ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie einen Link zum Zurücksetzen Ihres Passworts.' : 'Geben Sie die E-Mail-Adresse Ihres Kontos ein. Sie erhalten einen Link für ein neues Passwort.'}</p>
    </div>
    {sent ? <div className="portal-recovery-result" role="status">
      <p>Der Link ist <strong>30 Minuten</strong> gültig. Prüfen Sie auch Ihren Spam-Ordner.</p>
      <div className="portal-local-note"><strong>Lokaler Testbetrieb</strong><span>Es werden noch keine E-Mails versendet. Die Nachricht liegt im lokalen Testpostfach auf diesem Computer.</span></div>
      <button className="portal-primary" onClick={() => navigate('/anmelden')}>Zur Anmeldung<ArrowRight size={18}/></button>
      <button className="portal-link portal-resend" onClick={() => { setSent(false); setError(''); }}>Andere E-Mail-Adresse verwenden</button>
    </div> : <>
      {error && <Message>{error}</Message>}
      <form onSubmit={submit} noValidate aria-busy={busy}>
        <EmailField value={email} onChange={setEmail} error={fieldError} disabled={busy}/>
        <Submit busy={busy}>Link anfordern</Submit>
      </form>
      <p className="portal-form-footnote">Sie können Ihr bisheriges Passwort weiter verwenden, bis Sie ein neues festlegen.</p>
    </>}
  </>;
}

export function NewPasswordForm({ navigate, temporary, token, onDone, onExpired, onLogout }: SharedProps & {
  temporary: boolean; token: string; onDone: () => void; onExpired: () => void; onLogout: () => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [invalidLink, setInvalidLink] = useState(!temporary && !token);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    const next: Record<string, string> = {};
    if (password.length < 15 || password.length > 128 || !password.trim()) next['new-password'] = 'Verwenden Sie 15 bis 128 Zeichen.';
    if (!confirmation || password !== confirmation) next.confirmation = 'Die Passwörter stimmen nicht überein.';
    setFields(next); setError('');
    if (Object.keys(next).length) { focusField(Object.keys(next)[0]); return; }
    setBusy(true);
    try {
      await api(temporary ? '/auth/change-password' : '/auth/reset-password', { password, confirmation, ...(temporary ? {} : { token }) });
      setPassword(''); setConfirmation(''); onDone();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onExpired(); return; }
      if (err instanceof ApiError && err.code === 'INVALID_RESET') setInvalidLink(true);
      else setError(errorMessage(err));
    } finally { setBusy(false); }
  }
  async function logout() { setBusy(true); try { await onLogout(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); } }
  if (invalidLink) return <><Back navigate={navigate} busy={busy}/><div className="portal-step-icon"><KeyRound size={25}/></div>
    <div className="portal-form-heading"><h1>Neuer Link erforderlich.</h1><p>Dieser Link ist ungültig oder abgelaufen. Fordern Sie einen neuen Link an, um Ihr Passwort zurückzusetzen.</p></div>
    <button className="portal-primary" onClick={() => navigate('/passwort-vergessen')}>Neuen Link anfordern<ArrowRight size={18}/></button>
  </>;
  return <>
    {!temporary && <Back navigate={navigate} busy={busy}/>}
    <div className="portal-step-icon"><KeyRound size={25}/></div>
    <div className="portal-form-heading"><h1>{temporary ? 'Ihr eigenes Passwort.' : 'Neues Passwort festlegen.'}</h1>
      <p>{temporary ? 'Sie haben sich mit einem temporären Passwort angemeldet. Legen Sie jetzt Ihr persönliches Passwort fest, um fortzufahren.' : 'Wählen Sie ein neues Passwort für Ihr persönliches Konto.'}</p>
    </div>
    {error && <Message>{error}</Message>}
    <form onSubmit={submit} noValidate aria-busy={busy}>
      <PasswordField id="new-password" label="Neues Passwort" value={password} onChange={setPassword}
        autoComplete="new-password" error={fields['new-password']} disabled={busy} hint="15 bis 128 Zeichen. Ein langer Satz ist leicht zu merken."/>
      <PasswordField id="confirmation" label="Passwort wiederholen" value={confirmation} onChange={setConfirmation}
        autoComplete="new-password" error={fields.confirmation} disabled={busy}/>
      <div className="portal-password-checks" aria-live="polite">
        <span className={password.length >= 15 ? 'met' : ''}><Check size={15}/>Mindestens 15 Zeichen</span>
        <span className={confirmation && password === confirmation ? 'met' : ''}><Check size={15}/>Passwörter stimmen überein</span>
      </div>
      <Submit busy={busy}>Passwort speichern</Submit>
    </form>
    <p className="portal-form-footnote">Danach melden Sie sich mit Ihrem neuen Passwort an.</p>
    {temporary && <button type="button" className="portal-link portal-resend" onClick={logout} disabled={busy}>Abmelden und später fortfahren</button>}
  </>;
}
