import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, X } from 'lucide-react';
import { api, ApiError, errorMessage } from '../auth/api';
import { Message } from '../auth/AuthForms';
import { appearanceStyle, presetAppearance } from './appearance';
import type { Appearance, BrandTheme, Company } from './types';

export default function AppearanceEditor({company,onClose,onSaved,onExpired}:{company:Company;onClose:()=>void;onSaved:(company:Company)=>void;onExpired:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [theme,setTheme]=useState<BrandTheme>(company.brandTheme ?? 'default');
  const [draft,setDraft]=useState<Appearance>(company.appearance ?? presetAppearance(theme,company.brandColor));
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    // The dialog is removed rather than closed, so return focus to the control that opened it.
    const opener=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
    // Passive cleanup runs after removal; animation frames can be delayed, so restore at once and retry once.
    return ()=>{
      const restore=()=>{if(opener?.isConnected && document.activeElement!==opener) opener.focus();};
      restore(); window.setTimeout(restore,0);
    };
  },[]);
  const preview={...company,brandTheme:theme,appearance:draft};
  const colors: {key:keyof Omit<Appearance,'font'>;label:string}[]=[
    {key:'primary',label:'Hauptfarbe'},{key:'secondary',label:'Zusatzfarbe'},
    {key:'background',label:'Heller Hintergrund'},{key:'heading',label:'Überschriften'},
  ];
  async function save(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {
      const result=await api<{company:Company}>(`/companies/${company.id}/appearance`,{brandTheme:theme,appearance:draft});
      onSaved(result.company);
    } catch(err) {
      if(err instanceof ApiError && err.status===401) {onExpired();return;}
      setError(errorMessage(err));
    } finally {setBusy(false);}
  }
  return <dialog ref={dialog} className="appearance-editor" aria-labelledby="appearance-title" style={appearanceStyle(company)} onCancel={event=>{event.preventDefault();if(!busy) onClose();}}>
    <form onSubmit={save}>
      <header><div><h2 id="appearance-title">Erscheinungsbild bearbeiten</h2><p>{company.name} · Nur für dieses Unternehmen</p></div><button type="button" aria-label="Schließen" onClick={onClose} disabled={busy}><X size={22}/></button></header>
      {error && <Message>{error}</Message>}
      <div className="appearance-editor-grid"><fieldset disabled={busy} className="appearance-fields"><legend className="sr-only">Design einstellen</legend>
        <label htmlFor="appearance-template">Designvorlage</label><select id="appearance-template" value={theme} onChange={event=>{const next=event.target.value as BrandTheme;setTheme(next);setDraft(presetAppearance(next));}}><option value="default">Neutral</option><option value="schramm">SCHRAMM · bad & heizung</option></select>
        <p className="appearance-help">Eine Vorlage setzt die Farben und Schriften in dieser Vorschau zurück. Andere Unternehmen bleiben unverändert.</p>
        <div className="appearance-colors">{colors.map(({key,label})=><label key={key} className="appearance-color"><span>{label}</span><span><input type="color" aria-label={label} value={draft[key]} onInput={event=>{const value=event.currentTarget.value;setDraft(previous=>({...previous,[key]:value}));}} onChange={event=>{const value=event.target.value;setDraft(previous=>({...previous,[key]:value}));}}/><code>{draft[key].toUpperCase()}</code></span></label>)}</div>
        <label htmlFor="appearance-font">Schriftkombination</label><select id="appearance-font" value={draft.font} onChange={event=>setDraft({...draft,font:event.target.value as Appearance['font']})}><option value="brand">Markenschriften · Nohemi / Montserrat</option><option value="system">Systemschrift</option></select>
        <p className="appearance-help">Montserrat und Outfit sind enthalten. Bis die Nohemi-Dateien vorliegen, erscheinen Überschriften in Outfit.</p>
      </fieldset><section className="appearance-preview" style={appearanceStyle(preview)} aria-label="Designvorschau"><span>Vorschau</span><strong>{company.name}</strong><h3>Raum für gute Beratung.</h3><p>Ihre Badwelten und Kundenprojekte an einem Ort.</p><div className="appearance-preview-swatch"><span/><span/></div><div className="appearance-preview-sample"><Check size={18}/>Ihr Unternehmensbereich</div></section></div>
      <footer><p>Nach dem Speichern sehen Brudello und die Benutzer dieses Unternehmens dasselbe Design.</p><div><button type="button" className="company-secondary" onClick={onClose} disabled={busy}>Abbrechen</button><button type="submit" className="appearance-save" disabled={busy}>{busy ? <><LoaderCircle size={17} className="portal-spin"/>Wird gespeichert …</> : 'Änderungen speichern'}</button></div></footer>
    </form>
  </dialog>;
}
