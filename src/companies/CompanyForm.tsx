import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Download, Eye, EyeOff, KeyRound, LoaderCircle, Plus, Trash2, Users } from 'lucide-react';
import { api, ApiError, errorMessage } from '../auth/api';
import { portalURL } from '../auth/routes';
import { Message } from '../auth/AuthForms';
import type { CompanyCreated } from './types';

type DraftUser = { id: string; name: string; email: string };
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
interface Props { onClose: () => void; onCreated: (id: string) => void; onExpired: () => void; onPendingCredentials: (pending: boolean) => void; }

export default function CompanyForm({ onClose, onCreated, onExpired, onPendingCredentials }: Props) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [name, setName] = useState('SCHRAMM');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [brandColor, setBrandColor] = useState('#247b84');
  const [limit, setLimit] = useState('5');
  const [users, setUsers] = useState<DraftUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CompanyCreated | null>(null);
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [created]);
  // Temporary passwords are shown only once; leaving before saving them would lock the new users out.
  const pending = Boolean(created?.credentials.length) && !saved;
  useEffect(() => {
    onPendingCredentials(pending);
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); onPendingCredentials(false); };
  }, [pending, onPendingCredentials]);
  const capacity = Number(limit);
  function clearFieldError(id: string) {
    setErrors(previous => { const next = { ...previous }; delete next[id]; return next; });
  }
  function updateUser(id: string, key: 'name' | 'email', value: string) {
    setUsers(list => list.map(user => user.id === id ? { ...user, [key]: value } : user));
    clearFieldError(`${id}-${key}`);
  }
  function addUser() {
    const id = crypto.randomUUID(); setUsers(list => [...list, { id, name: '', email: '' }]);
    requestAnimationFrame(() => document.getElementById(`${id}-name`)?.focus());
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const next: Record<string, string> = {};
    if (!name.trim()) next['company-name'] = 'Bitte geben Sie einen Unternehmensnamen ein.';
    if (contactEmail && !emailValid(contactEmail)) next['company-email'] = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) next['company-limit'] = 'Bitte wählen Sie 1 bis 1.000 Benutzer.';
    else if (users.length > capacity) next['company-limit'] = 'Das Limit ist kleiner als die Anzahl der angelegten Benutzer.';
    const emails = new Set<string>();
    for (const user of users) {
      if (!user.name.trim()) next[`${user.id}-name`] = 'Bitte geben Sie den Namen ein.';
      const email = user.email.trim().toLowerCase();
      if (!emailValid(email)) next[`${user.id}-email`] = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      else if (emails.has(email)) next[`${user.id}-email`] = 'Diese E-Mail-Adresse wurde bereits eingetragen.';
      emails.add(email);
    }
    setErrors(next); setError('');
    if (Object.keys(next).length) { requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus()); return; }
    setBusy(true);
    try {
      const result = await api<CompanyCreated>('/companies', {
        requestId, name, contactName, contactEmail, brandColor, userLimit: capacity,
        users: users.map(user => ({name: user.name, email: user.email})),
      });
      setCreated(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { onExpired(); return; }
      setError(errorMessage(err));
    } finally { setBusy(false); }
  }
  function download() {
    if (!created) return;
    const contents = [`${created.company.name} – Temporäre Zugangsdaten`, `Anmeldung: ${window.location.origin}${portalURL(created.company.portalSlug)}`,
      'Gültig für 72 Stunden ab Erstellung. Passwort beim ersten Anmelden ändern.',
      'Vertraulich: Zugangsdaten nur an die jeweils berechtigte Person weitergeben.', '',
      ...created.credentials.flatMap(user => [`Name: ${user.name}`, `E-Mail: ${user.email}`, `Temporäres Passwort: ${user.password}`, ''])].join('\n');
    const url = URL.createObjectURL(new Blob([contents], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'Brudello-Zugangsdaten.txt'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Starting a download is no proof the file was stored (blocked or cancelled); the checkbox stays manual.
  }
  const field = (id: string, label: string, value: string, setter: (value: string) => void, optional = false, type = 'text', maxLength = 120) =>
    <div className="portal-field"><label htmlFor={id}>{label}{optional && <span className="company-optional"> Optional</span>}</label>
      <input id={id} type={type} value={value} onChange={event => { setter(event.target.value); clearFieldError(id); }} maxLength={maxLength}
        disabled={busy} required={!optional} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? `${id}-error` : undefined}/>
      {errors[id] && <small className="portal-field-error" id={`${id}-error`}>{errors[id]}</small>}</div>;

  if (created) return <section className="company-created">
    <div className="company-success-icon"><Check size={29}/></div>
    <h1 ref={heading} tabIndex={-1}>{created.company.name} ist eingerichtet.</h1>
    <p>Die Startseite ist bereit. {created.company.userCount} von {created.company.userLimit} Benutzerplätzen sind belegt.</p>
    <p>Unternehmenscode: <strong>{created.company.portalSlug}</strong> · <a href={portalURL(created.company.portalSlug)} target="_blank" rel="noreferrer">Eigene Anmeldeseite öffnen</a></p>
    {created.replayed && <Message success>Das Unternehmen wurde bereits erfolgreich gespeichert. Es wurde kein zweites Unternehmen angelegt.</Message>}
    {created.credentials.length > 0 && <section className="company-credentials" aria-labelledby="credentials-title">
      <div className="company-credentials-heading"><h2 id="credentials-title">Temporäre Zugangsdaten</h2><button type="button" className="portal-link" onClick={() => setVisible(v => !v)} aria-pressed={visible}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>} {visible ? 'Passwörter verbergen' : 'Passwörter anzeigen'}</button></div>
      <p>Speichern Sie die Zugangsdaten jetzt. Sie werden nur hier angezeigt. Jeder Benutzer muss sein Passwort beim ersten Anmelden ändern.</p>
      <ul>{created.credentials.map(user => <li key={user.email}><div><strong>{user.name}</strong><span>{user.email}</span></div><code>{visible ? user.password : '••••••••••••••••'}</code></li>)}</ul>
      <button type="button" className="company-secondary" onClick={download}><Download size={17}/>Zugangsdaten herunterladen</button>
      <p className="company-credential-note">72 Stunden gültig. Es wurden keine E-Mails versendet.</p>
      <label className="company-saved-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} aria-describedby={pending ? 'credentials-pending' : undefined}/>Ich habe die Zugangsdaten sicher gespeichert.</label>
      {pending && <p className="portal-hint" id="credentials-pending">Speichern Sie die Zugangsdaten (z. B. per Download) und bestätigen Sie anschließend hier. Danach können Sie die Seite verlassen.</p>}
    </section>}
    {created.replayed && created.company.userCount > 0 && <p>Die Passwörter werden nicht erneut angezeigt. Bei Bedarf kann jeder Benutzer über „Passwort vergessen?“ einen neuen Zugang anfordern.</p>}
    <div className="company-created-actions"><button className="company-secondary" onClick={onClose} disabled={pending}>Zur Unternehmensübersicht</button><button className="portal-primary" onClick={() => onCreated(created.company.id)} disabled={pending}>Unternehmensseite öffnen<ArrowRight size={18}/></button></div>
  </section>;
  return <>
    <button className="portal-back company-back" type="button" onClick={onClose} disabled={busy}><ArrowLeft size={17}/>Zur Unternehmensübersicht</button>
    <div className="company-form-intro"><h1 ref={heading} tabIndex={-1}>Unternehmen hinzufügen</h1><p>Richten Sie einen eigenen Bereich für Ihren Partner ein.</p></div>
    <form onSubmit={submit} noValidate aria-busy={busy} className="company-form-layout">
      <div className="company-form-sections">
        {error && <Message>{error}</Message>}
        <section className="company-form-section" aria-labelledby="company-data-heading"><div className="company-section-title"><Building2 size={21}/><div><h2 id="company-data-heading">Unternehmensdaten</h2><p>So erscheint das Unternehmen in Ihrem Partnerportal.</p></div></div>
          {field('company-name', 'Unternehmensname', name, setName)}
          <div className="company-field-row">{field('company-contact', 'Kontaktperson', contactName, setContactName, true)}{field('company-email', 'Kontakt-E-Mail', contactEmail, setContactEmail, true, 'email', 254)}</div>
          <div className="company-brand-field"><div><label htmlFor="company-color">Markenfarbe</label><p>Für die persönliche Startseite des Unternehmens.</p></div><input id="company-color" type="color" value={brandColor} disabled={busy} onChange={e => setBrandColor(e.target.value)}/><span>{brandColor.toUpperCase()}</span></div>
        </section>
        <section className="company-form-section" aria-labelledby="company-access-heading"><div className="company-section-title"><Users size={21}/><div><h2 id="company-access-heading">Benutzer & Zugänge</h2><p>Sie bestimmen, wie viele Personen Zugang erhalten.</p></div></div>
          <div className="portal-field company-limit-field"><label htmlFor="company-limit">Benutzerlimit</label><input id="company-limit" type="number" min={1} max={1000} step={1} value={limit} disabled={busy} onChange={e => { setLimit(e.target.value); clearFieldError('company-limit'); }} aria-invalid={Boolean(errors['company-limit'])} aria-describedby="company-limit-hint"/>
            <small id="company-limit-hint" className={errors['company-limit'] ? 'portal-field-error' : 'portal-hint'}>{errors['company-limit'] || 'Maximale Anzahl der Benutzerkonten für dieses Unternehmen.'}</small></div>
          <div className="company-users-heading"><h3>Erste Benutzer anlegen <span>Optional</span></h3><span>{users.length} / {limit || '–'}</span></div>
          {!users.length && <div className="company-no-users"><KeyRound size={19}/><p>Sie können das Unternehmen zunächst ohne Benutzer anlegen oder die ersten Zugänge gleich einrichten.</p></div>}
          {users.map((user, index) => <fieldset className="company-user-row" key={user.id} disabled={busy}><legend>Benutzer {index + 1}</legend>
            <div className="company-field-row">{field(`${user.id}-name`, 'Vor- und Nachname', user.name, value => updateUser(user.id, 'name', value))}{field(`${user.id}-email`, 'E-Mail-Adresse', user.email, value => updateUser(user.id, 'email', value), false, 'email', 254)}</div>
            <button className="company-remove-user" type="button" onClick={() => setUsers(list => list.filter(item => item.id !== user.id))} aria-label={`Benutzer ${index + 1} entfernen`}><Trash2 size={16}/>Entfernen</button>
          </fieldset>)}
          <button type="button" className="company-secondary" disabled={busy || users.length >= capacity || users.length >= 50 || !Number.isInteger(capacity) || capacity < 1} onClick={addUser}><Plus size={17}/>Benutzer hinzufügen</button>
          {users.length >= 50 && <p className="portal-hint">Pro Anlage können bis zu 50 Benutzer eingerichtet werden.</p>}
          <div className="company-password-note"><KeyRound size={18}/><p>Für jeden Benutzer wird ein temporäres Passwort erstellt. Nach dem Speichern können Sie die Zugangsdaten herunterladen. Es werden noch keine E-Mails versendet.</p></div>
        </section>
        <div className="company-form-actions"><button className="company-secondary" type="button" onClick={onClose} disabled={busy}>Abbrechen</button><button className="portal-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={18} className="portal-spin"/>Wird eingerichtet …</> : <>Unternehmen erstellen<ArrowRight size={18}/></>}</button></div>
      </div>
      <aside className="company-summary" aria-label="Zusammenfassung"><span className="company-summary-label">Vorschau</span><div className="company-summary-mark" style={{borderColor:brandColor}}><Building2 size={31} style={{color:brandColor}}/></div><h2>{name.trim() || 'Ihr Unternehmen'}</h2><p>Eigene Startseite im Partnerportal</p><dl><div><dt>Benutzerplätze</dt><dd>{limit || '–'}</dd></div><div><dt>Erste Benutzer</dt><dd>{users.length}</dd></div><div><dt>Sprache</dt><dd>Deutsch</dd></div></dl><div className="company-summary-note"><Check size={17}/><span>Eigener Unternehmensbereich</span></div><div className="company-summary-note"><Check size={17}/><span>Zugriff nur für zugeordnete Benutzer und Brudello</span></div></aside>
    </form>
  </>;
}
